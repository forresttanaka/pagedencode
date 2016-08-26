import React from 'react';
import {render} from 'react-dom';
import 'whatwg-fetch';


class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {data: []};
        this.getSegment().then((data) => {
            this.setState({data: data});
        });
    }

    getSegment(start) {
        return fetch('https://test.encodedcc.org/search/?type=Experiment&format=json')
        .then(response => {
            return response.text();
        }).then(body => {
            var data = JSON.parse(body);
            return Promise.resolve(data['@graph'].map(result => result.accession));
        });
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
