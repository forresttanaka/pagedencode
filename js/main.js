import React from 'react';
import {render} from 'react-dom';
import 'whatwg-fetch';


class App extends React.Component {
    constructor(props) {
        super(props);

        // Set React initial states
        this.state = {
            count: 0, // Number of experiments read so far
            total: 0 // Total number of experiments in database
        };

        // Set class variables
        this.start = 0;
        this.max = 5;
        this.data = [];

        // GET initial ENCODE data
        this.getSegment(this.start, 50).then((data) => {
            // Return an array of all the accessions
            var accessions = data['@graph'].map(result => result.accession);

            // Got an array of accessions from retrieved data. Trigger their rendering
            this.accessions = accessions;
            this.setState({count: accessions.length});

            // Start the next query at the end of the current one.
            this.start += accessions.length;

            // Get the total number of experiments in the database
            var typeFacet = data.facets.find(facet => facet.field === 'type');
            var experimentTypeTerm = typeFacet.terms.find(term => term.key === 'Experiment');
            this.setState({total: experimentTypeTerm.doc_count});
        });

        // Start the interval to do GET requests after a delay reduce server load
        this.interval = setInterval(this.tick.bind(this), 3000);
    }

    // Called when the interval timer expires
    tick() {
        // Interval timer has expired. Begin a new Get request
        this.getSegment(this.start, 50).then(function(data) {
            // Return an array of all the accessions
            var accessions = data['@graph'].map(result => result.accession);

            // Add the newly retrieved accessions to our current array of accessions
            this.accessions = this.accessions.concat(accessions);

            // Trigger rendering the new accessions
            this.setState({count: this.accessions.length});

            // Advance to the next group of accessions to get
            this.start = this.accessions.length;

            // If we hit the maximum number of GETs, clear the interval timer -- we're done!'
            if (--this.max === 0) {
                clearInterval(this.interval);
                this.interval = null;
            }
        }.bind(this));
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
                // Convert JSON to Javascript object
                return Promise.resolve(JSON.parse(body));
            });
    }

    componentWillUnmount() {
        if (this.interval) {
            clearInterval(this.interval);
        }
    }

    render() {
        return (
            <div>
                <p>Total experiments {this.state.total}</p>
                <p>Current experiments read {this.state.count}</p>
            </div>
        );
    }
};


render(<App />, document.getElementById('app'));
