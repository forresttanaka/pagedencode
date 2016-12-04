import React from 'react';
import { render } from 'react-dom';
import 'whatwg-fetch';
import _ from 'underscore';


const totalRetrieveExperiments = 20; // Total # experiments to retrieve
const segmentSize = 100; // # experiments to retrieve per segment

class App extends React.Component {
    // From the search result data, get the list of experiment accessions as an array of strings.
    static getIdsFromData(data) {
        return data['@graph'].map(result => result['@id']);
    }

    // Given a search result, get the total number of experiments in the database
    static getExperimentTotalFromResult(result) {
        const typeFacet = result.facets.find(facet => facet.field === 'type');
        const experimentTypeTerm = typeFacet.terms.find(term => term.key === 'Experiment');
        return experimentTypeTerm.doc_count;
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

    static getExperiment(experimentId) {
        const url = `http://localhost:6543${experimentId}`;
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
        }).catch((e) => {
            console.log('OBJECT LOAD ERROR: %s', e);
        });
    }

    constructor(props) {
        super(props);

        // Set React initial states.
        this.state = {
            total: 0, // Total number of experiments in database
            segmentedResults: [], // Array of accessions from segmented search requests
        };

        const experimentStats = [];

        // Start the process by getting all experiment @ids in the database.
        this.getExperimentsIds().then((experimentIds) =>
            // Send out all our segment GET requests.
            experimentIds.reduce((promise, experimentId) =>
                promise.then(() =>
                    App.getExperiment(experimentId)
                ).then((experiment) => {
                    experimentStats.push({ id: experimentId, size: experiment.length });
                    return experimentStats;
                }), Promise.resolve(experimentIds)
            )
        ).then((experimentResults) => {
            console.log(experimentResults);
            const experimentStatsSorted = experimentResults.sort((a, b) => (a.size - b.size));
        });
    }

    getExperimentsIds() {
        // Send an initial GET request to search for segment of experiments, so we can get the
        // total number of experiments.
        return App.getSegment(0, segmentSize).then((result) => {
            const totalExperiments = App.getExperimentTotalFromResult(result);

            // Display the total number of experiments.
            this.setState({ total: totalExperiments });

            // Add this set of experiment @ids to the array of them we're collecting.
            let experimentIds = App.getIdsFromData(result);

            // Now get ready the experiment segment retrieval loop. We'll get a segment of
            // experiments and extract their @ids until we have all of them. We'll do this by first
            // making an array called `searchParms` of simple objects containing the starting index
            // and count for the segment.
            const searchParms = (() => {
                let start = 0;
                let experimentsLeft = totalExperiments - experimentIds.length;
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
                ).then((segment) => {
                    // Got one segment of experiments. Add it to our array of @ids in retrieval order for now.
                    experimentIds = experimentIds.concat(App.getIdsFromData(segment));

                    return experimentIds;
                }), Promise.resolve(experimentIds)
            );
        });
    }

    render() {
        return (
            <div>
                <p>Total experiments {this.state.total}</p>
                <table className="results">
                    <tbody>
                        {this.state.segmentedResults.map((segmentedResult, i) => {
                            return (
                                <tr key={i}>
                                    <td>{segmentedResult}</td>
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
