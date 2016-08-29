import React from 'react';
import {render} from 'react-dom';
import 'whatwg-fetch';
import _ from 'underscore';


const totalRetrieveExperiments = 200; // Total # experiments to retrieve
const segmentSize = 50; // # experiments to retrieve per segment

class App extends React.Component {
    constructor(props) {
        super(props);

        // Set class variables
        this._segmentedAccessions = [];
        this._segmentedResults = [];
        this._fullAccessions = [];

        // Set React initial states
        this.state = {
            count: 0, // Number of experiments read so far for segmented reads
            total: 0 // Total number of experiments in database
        };

        this.getSegmentedExperiments().then(function(results) {
            let sortedResults = results.sort((a, b) => a.startIndex - b.startIndex);
            this._segmentedResults = _.flatten(sortedResults.map(result => this.getAccessionsFromData(result)));
        }.bind(this));
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

    getSegmentedExperiments() {
        var start = 0; // Starting index for experiments to retrieve
        var currSegmentSize = 0; // Number of experiments to retrieve for this segment
        var segmentedResults = []; // All search results

        // Generate an array of search parameters
        var searchParms = (function() {
            let start = 0;
            let parms = [];
            let experimentsLeft = totalRetrieveExperiments;
            while (experimentsLeft > 0) {
                let currSegmentSize = experimentsLeft > segmentSize ? segmentSize : experimentsLeft;
                parms.push({start: start, count: currSegmentSize});
                start += currSegmentSize;
                experimentsLeft = totalRetrieveExperiments - start;
            }
            return parms;
        })();

        // Send out all our segment GET requests.
        return searchParms.reduce(function(promise, parm) {
            return promise.then(function() {
                // Send the GET request for one segment
                return this.getSegment(parm.start, parm.count);
            }.bind(this)).then(function(result) {
                // Got one result. Add it to our array of results in retrieval order for now.
                segmentedResults.push(result);

                // If we don't yet have the total number of experiments, get it from the first
                // search results and render it.
                if (!this.state.total) {
                    this.setState({total: this.getExperimentTotalFromResult(result)});
                }

                return segmentedResults;
            }.bind(this));
        }.bind(this), Promise.resolve());
    }

    getAllExperiments() {
        return this.getSegment(this._start, 1000).then((data) => {
            // Return an array of all the accessions
            var accessions = this.getAccessionsFromData(data);
        });
    }

    // Issue a GET request on ENCODE data and return a promise with the ENCODE search response.
    // - start: starting search result index of data being requested. default 0.
    // - count: Number of entries to retrieve. default is ENCODE system default. 'all' for all
    //          entries.
    getSegment(start, count) {
        var url = 'https://test.encodedcc.org/search/?type=Experiment&format=json'
            + (count ? '&limit=' + count : '')
            + (start ? '&from=' + start : '');
        return fetch(url)
            .then(response => {
                // Convert response to JSON
                return response.text();
            }).then(body => {
                // Convert JSON to Javascript object, then attach start index so we can sort the
                // segments later if needed
                var result = JSON.parse(body);
                result.startIndex = start;
                return Promise.resolve(result);
            });
    }

    render() {
        return (
            <div>
                <p>Total experiments {this.state.total}</p>
                <p>Current experiments read {this.state.count}</p>
            </div>
        );
    }
}


render(<App />, document.getElementById('app'));
