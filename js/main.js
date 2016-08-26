import React from 'react';
import {render} from 'react-dom';
import 'whatwg-fetch';


class App extends React.Component {
    constructor(props) {
        super(props);

        // Set React states
        this.state = {data: []};

        // Set class variables
        this.start = 0;
        this.max = 5;

        // GET initial ENCODE data
        this.getSegment(this.start).then((data) => {
            // Got an array of accessions from retrieved data. Trigger their rendering
            this.setState({data: data});

            // Start the next query at the end of the current one.
            this.start += data.length;
        });

        // Start the interval to do get requests every five seconds
        this.interval = setInterval(this.tick.bind(this), 5000);
    }

    // Called when the interval timer expires
    tick() {
        // Interval timer has expired. Begin a new Get request
        this.getSegment(this.start).then((data) => {
            // Add the newly retrieved accessions to our current array of accessions
            var newData = this.state.data.concat(data);

            // Trigger rendering the new accessions
            this.setState({data: newData});

            // Advance to the next group of accessions to get
            this.start += data.length;

            // If we hit the maximum number of GETs, clear the interval timer -- we're done!'
            if (--this.max === 0) {
                clearInterval(this.interval);
                this.interval = null;
            }
        });
    }

    // Issue a GET request on ENCODE data and return a promise with an array of ENCODE experiment
    // accessions.
    getSegment(start) {
        return fetch('https://test.encodedcc.org/search/?type=Experiment&format=json&from=' + start)
        .then(response => {
            // Convert response to JSON
            return response.text();
        }).then(body => {
            // Convert JSON to Javascript object
            var data = JSON.parse(body);

            // Return an array of all the accessions
            return Promise.resolve(data['@graph'].map(result => result.accession));
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
                <p>Hello there {this.state.data.length}</p>
                {this.state.data.join(', ')}
            </div>
        );
    }
};


render(<App />, document.getElementById('app'));
