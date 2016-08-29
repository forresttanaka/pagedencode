import React from 'react';
import {render} from 'react-dom';
import 'whatwg-fetch';
import _ from 'underscore';


const totalRetrieveExperiments = 1000; // Total # experiments to retrieve
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
            differenceCount: 0, // Total experiments different between segmented and monolithic
            segmentedResults: [], // Array of accessions from segmented search requests
            monolithicResults: [] // Array of accessions from a monolitic search request
        };

        this.getSegmentedExperiments().then(function(results) {
            let sortedResults = results.sort((a, b) => a.startIndex - b.startIndex);
            this._segmentedResults = _.flatten(sortedResults.map(result => this.getAccessionsFromData(result)));
            return this.getAllExperiments();
        }.bind(this)).then(function(results) {
            this._monolithicResults = this.getAccessionsFromData(results);
            var differenceCount = this._segmentedResults.reduce((prev, curr, i) => { return prev + (curr !== this._monolithicResults[i] ? 1 : 0); }, 0);
            this.setState({
                segmentedResults: this._segmentedResults,
                monolithicResults: this._monolithicResults,
                differenceCount: differenceCount
            });
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
        return this.getSegment(0, totalRetrieveExperiments);
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
                <p>Total differences {this.state.differenceCount}</p>
                <table className="results">
                    <tbody>
                        {this.state.segmentedResults.map((segmentedResult, i) => {
                            var differs = segmentedResult !== this.state.monolithicResults[i] ? 'different' : '';
                            return (
                                <tr key={i} className={differs}>
                                    <td>{segmentedResult}</td>
                                    <td>{this.state.monolithicResults[i]}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    }
}


render(<App />, document.getElementById('app'));
