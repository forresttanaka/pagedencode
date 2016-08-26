import React from 'react';
import {render} from 'react-dom';
import 'whatwg-fetch';


class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {data: []};
        this.start = 0;
        this.max = 5;

        // GET initial ENCODE data
        this.getSegment(this.start).then((data) => {
            this.setState({data: data});
        });

        // Start the interval to do get requests every five seconds
        this.interval = setInterval(this.tick.bind(this), 5000);
    }

    tick() {
        this.getSegment(this.start).then((data) => {
            var newData = this.state.data.concat(data);
            this.setState({data: newData});
            this.start += data.length;
            if (--this.max === 0) {
                clearInterval(this.interval);
                this.interval = null;
            }
        });
    }

    getSegment(start) {
        return fetch('https://test.encodedcc.org/search/?type=Experiment&format=json&from=' + start)
        .then(response => {
            return response.text();
        }).then(body => {
            var data = JSON.parse(body);
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
                <p>Hello there</p>
                {this.state.data.join(', ')}
            </div>
        );
    }
};


render(<App />, document.getElementById('app'));
