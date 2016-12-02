import React from 'react';
import { render } from 'react-dom';
import 'whatwg-fetch';
import _ from 'underscore';


const totalRetrieveExperiments = 20; // Total # experiments to retrieve
const segmentSize = 50; // # experiments to retrieve per segment

class App extends React.Component {
    // From the search result data, get the list of experiment accessions as an array of strings.
    static getAccessionsFromData(data) {
        return data['@graph'].map(result => result.accession);
    }

    // Given a search result, get the total number of experiments in the database
    static getExperimentTotalFromResult(result) {
        const typeFacet = result.facets.find(facet => facet.field === 'type');
        const experimentTypeTerm = typeFacet.terms.find(term => term.key === 'Experiment');
        return experimentTypeTerm.doc_count;
    }

    static getAllExperiments() {
        return this.getSegment(0, totalRetrieveExperiments);
    }

    // Issue a GET request on ENCODE data and return a promise with the ENCODE search response.
    // - start: starting search result index of data being requested. default 0.
    // - count: Number of entries to retrieve. default is ENCODE system default. 'all' for all
    //          entries.
    static getSegment(start, count) {
        const url = `http://localhost:6543/search/?type=Experiment${count ? `&limit=${count}` : ''}${start ? `&from=${start}` : ''}`;
        return fetch(url, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
            },
        }).then((response) => {
            // Convert response to JSON
            if (response.ok) {
                return response.text();
            }
            throw new Error('not ok');
        }).then((body) => {
            // Convert JSON to Javascript object, then attach start index so we can sort the
            // segments later if needed
            try {
                const result = JSON.parse(body);
                result.startIndex = start;
                return Promise.resolve(result);
            } catch (error) {
                console.log('ERR: %s,%o', error, body);
            }
            return Promise.resolve();
        }).catch((e) => {
            console.log('OBJECT LOAD ERROR: %s', e);
        });
    }

    constructor(props) {
        super(props);

        // Set React initial states
        this.state = {
            total: 0, // Total number of experiments in database
            differenceCount: 0, // Total experiments different between segmented and monolithic
            segmentedResults: [], // Array of accessions from segmented search requests
            monolithicResults: [], // Array of accessions from a monolitic search request
        };

        let segmentedResults = [];
        this.getSegmentedExperiments().then((results) => {
            const sortedResults = results.sort((a, b) => a.startIndex - b.startIndex);
            segmentedResults = _.flatten(sortedResults.map(result => App.getAccessionsFromData(result)));
            return App.getAllExperiments();
        }).then((results) => {
            const monolithicResults = App.getAccessionsFromData(results);
            const differenceCount = segmentedResults.reduce((prev, curr, i) => prev + (curr !== monolithicResults[i] ? 1 : 0), 0);
            this.setState({
                segmentedResults: segmentedResults,
                monolithicResults: monolithicResults,
                differenceCount: differenceCount,
            });
        });
    }

    getSegmentedExperiments() {
        const segmentedResults = []; // All search results

        // Generate an array of search parameters
        const searchParms = (() => {
            let start = 0;
            let experimentsLeft = totalRetrieveExperiments;
            const parms = [];
            while (experimentsLeft > 0) {
                const currSegmentSize = experimentsLeft > segmentSize ? segmentSize : experimentsLeft;
                parms.push({ start: start, count: currSegmentSize });
                start += currSegmentSize;
                experimentsLeft = totalRetrieveExperiments - start;
            }
            return parms;
        })();

        // Send out all our segment GET requests.
        return searchParms.reduce((promise, parm) =>
            promise.then(() =>
                // Send the GET request for one segment
                App.getSegment(parm.start, parm.count)
            ).then((result) => {
                // Got one result. Add it to our array of results in retrieval order for now.
                segmentedResults.push(result);

                // If we don't yet have the total number of experiments, get it from the first
                // search results and render it.
                if (!this.state.total) {
                    this.setState({ total: App.getExperimentTotalFromResult(result) });
                }

                return segmentedResults;
            }), Promise.resolve());
    }

    render() {
        return (
            <div>
                <p>Total experiments {this.state.total}</p>
                <p>Total differences {this.state.differenceCount}</p>
                <table className="results">
                    <tbody>
                        {this.state.segmentedResults.map((segmentedResult, i) => {
                            const differs = segmentedResult !== this.state.monolithicResults[i] ? 'different' : '';
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
