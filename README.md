# jsmirror - A prototype of a mirrors-based reflection interface for JavaScript

#Files:
 * mirrorsInterfaceSpec.js Specification of the mirror interfaces using an ad hoc interface description language
 * mirrors.js A prototype implementation of the interfaces that supports reflecting over both local and JSON encoded object graphs
 * mtest.html Runs a bunch of tests on mirrors.js.  Also use it as usage samples.
 * jsonObjSample.js Test data used by mtest.html and basic description of encoding


#Getting started:
Run mtest.html to see samples of using jsmirror.  Look at the interface definitions in mirrorsInterfaceSpec.js.  Read the code.

The mirrors.js prototype requires a JavaScript implementation that supports ES5 functionality.
These is limited use of strict mode but in general things will still work without it.

For an introduction to the princples behind mirror based reflection read: [Mirrors: design principles for meta-level facilites of object-oriented programming languages](http://bracha.org/mirrors.pdf) by Gilad Beracha and David Ungar.


--------------
Allen Wirfs-Brock  
April 20, 2011  
allen@wirfs-brock.com  
allenwb@mozilla.com  

