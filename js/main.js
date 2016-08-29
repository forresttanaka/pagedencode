import React from 'react';
import {render} from 'react-dom';
import 'whatwg-fetch';
import _ from 'underscore';


const segmentSize = 50; // # experiments to retrieve per segment

class App extends React.Component {
    constructor(props) {
        super(props);

        // Set class variables
        this._segmentedResults = [];
        this._monolithicResults = [];

        // Set React initial states
        this.state = {
            total: 0, // Total number of experiments in database
            current: 0, // Current number of experiments retrieved
            results: {}, // Accessions of all retrieved experiments
            duplicates: [] // Array of duplicate accessions
        };

        // Start the program by doing a basic search just to get the total number of experiments
        // in the ENCODE database.
        this.getSegment().then(function(result) {
            // Get the total number of experiments
            var totalExperiments = this.getExperimentTotalFromResult(result);
            this.setState({total: totalExperiments});

            // Now get all experiments in the database as a search
            return this.getSegmentedExperiments(totalExperiments);
        }.bind(this)).then(function(results) {
            // Got all experiments in the database as an array of segmented search results. sort
            // the results by their starting index (likely not actually needed) then combine all
            // resulting experiment accessions into one array.
            let sortedResults = results.sort((a, b) => a.startIndex - b.startIndex);
            this._segmentedResults = _.flatten(sortedResults.map(result => this.getAccessionsFromData(result)));

            // Find any duplicate accessions in the array
            var duplicates = this.findDuplicates(this._segmentedResults);
            this.setState({
                duplicates: duplicates,
                results: this._segmentedResults
            });
        }.bind(this));
    }

    findDuplicates(data) {
        var result = [];

        data.forEach((element, i) => {
            // Find if there is a duplicate or not
            if (data.indexOf(element, i + 1) > -1) {
                // Find if the element is already in the result array or not
                if (result.indexOf(element) === -1) {
                    result.push(element);
                }
            }
        });

        return result;
    }

    // Given a search result, get the total number of experiments in the database
    getExperimentTotalFromResult(result) {
        var typeFacet = result.facets.find(facet => facet.field === 'type');
        var experimentTypeTerm = typeFacet.terms.find(term => term.key === 'Experiment');
        return experimentTypeTerm.doc_count;
    }

    // From the search result data, get the list of experiment accessions as an array of strings.
    getAccessionsFromData(data) {
        return data['@graph'].map(result => result.accession);
    }

    getSegmentedExperiments(totalExperiments) {
        var start = 0; // Starting index for experiments to retrieve
        var currSegmentSize = 0; // Number of experiments to retrieve for this segment
        var segmentedResults = []; // All search results

        // Generate an array of search parameters
        var searchParms = (function() {
            let start = 0;
            let parms = [];
            let experimentsLeft = totalExperiments;
            while (experimentsLeft > 0) {
                let currSegmentSize = experimentsLeft > segmentSize ? segmentSize : experimentsLeft;
                parms.push({start: start, count: currSegmentSize});
                start += currSegmentSize;
                experimentsLeft = totalExperiments - start;
            }
            return parms;
        })();

        // Send out all our segment GET requests.
        return searchParms.reduce(function(promise, parm) {
            return promise.then(function() {
                // Send the GET request for one segment
                return this.getSegment(parm.start, parm.count);
            }.bind(this)).then(function(result) {
                // Got one result (multiple experiments). Add it to our array of results in
                // retrieval order for now.
                segmentedResults.push(result);

                var resultsSoFar = this.state.current + result['@graph'].length;
                this.setState({current: resultsSoFar});

                return segmentedResults;
            }.bind(this));
        }.bind(this), Promise.resolve());
    }

    // Issue a GET request on ENCODE data and return a promise with the ENCODE search response.
    // - start: starting search result index of data being requested. default 0.
    // - count: Number of entries to retrieve. default is ENCODE system default. 'all' for all
    //          entries.
    getSegment(start, count) {
        var url = 'https://www.encodeproject.org/search/?type=Experiment&format=json'
            + (count ? '&limit=' + count : '')
            + (start ? '&from=' + start : '');
        return fetch(url)
            .then(response => {
                // Convert response to JSON
                return response.text();
            }).then(body => {
                // Convert JSON to Javascript object, then attach start index so we can sort the
                // segments later if needed
                try {
                    var result = JSON.parse(body);
                    result.startIndex = start;
                    return Promise.resolve(result);
                } catch(error) {
                    console.log('ERR: %s,%o', body);
                }
            });
    }

    render() {
        return (
            <div>
                <p>Total experiments {this.state.total}</p>
                <p>Retrieved experiments {this.state.current}</p>
                <p>Duplicate experiments {this.state.duplicates.length}</p>
                {this.state.results && this.state.results.length ?
                    <div className="results">
                        {this.state.results.map((result, i) => {
                            var resultClass = 'result' + (this.state.duplicates.indexOf(result) !== -1 ? ' duplicate' : ''); 
                            return <div className={resultClass} key={i}>{result}</div>;
                        })}
                    </div>
                : null}
            </div>
        );
    }
}


render(<App />, document.getElementById('app'));
