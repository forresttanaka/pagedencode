# pagedencode

Before you can open this website locally, it has to be built.

First install node and npm from https://nodejs.org/en/.

Then install the npm modules required by this site by using the terminal and making this project’s root directory the current one, then entering:

```
$ npm install
```

Install webpack globally with:

```
$ npm install webpack
```

Finally, build the Javascript files with:

```
$ webpack
```

Last, open index.html in your browser. It loads the Javascript file you just built, then does some GET requests to https://encodeproject.org.
