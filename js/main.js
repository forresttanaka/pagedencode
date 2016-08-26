import 'whatwg-fetch';

fetch('https://www.encodeproject.org/search/?type=Experiment&format=json')
.then(response => {
    return response.text();
}).then(body => {
    console.log(body);
});
