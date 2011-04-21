/*
//json Object domain serialization schema
//
//Represents a domain of mutually referencial objects and functions.
//May contain symbolic reference to objects from outside the domain

//Objects
{"obj": id,  //
 "[Prototype]": ref,
 "extensible": boolean,
 "props": [{propDesc}],
 "special": string  //optional
 }
{"func": id,
 "[Prototype]": ref,
 "extensible": boolean,
 "props": [{propDesc}],
 "name": string,
 "src": string
 }
 
 //property values are encodede as either primitive values or one of the following "ref" objects:
 {"objRef": id}
 {"extern": namestr}
 {"undef": "ined"}
 
// propDesc: propoerty descriptors 
 {"data": name,
  "value": ref|prim,
  "enumerable": boolean,
  "configurable": boolean,
  "writable": boolean
 }
 {"accessor": name,
  "get": objRef,
  "set": objRef,
  "enumerable": boolean,
  "configurable": boolean
 }
 
*/ 
 
 var D = JSON.parse('[{"obj": 0, "[Prototype]": {"extern": "Object.prototype"}, "extensible": true, "props": [\
    {"data": "a", "value": 1, "enumerable": true, "configurable": true, "writable": true},\
    {"data": "b", "value": 2, "enumerable": true, "configurable": true, "writable": false},\
    {"accessor": "x", "get": {"objRef": 2}, "enumerable": true, "configurable": true }]},\
   {"obj":1, "[Prototype]": {"objRef": 0}, "extensible": false, "props": [\
    {"data": "c", "value": 3, "enumerable": false, "configurable": false, "writable": false},\
    {"data": "d", "value": 4, "enumerable": true, "configurable": false, "writable": false},\
    {"data": "z", "value": {"objRef": 1}, "enumerable": true, "configurable": true, "writable": false }]},\
   {"func":2, "[Prototype]": {"extern": "Function.prototype"}, "name": "foo", "src": "function() {return \'x getter\'}", "extensible": true, "props": [\
    {"data": "prototype", "value": {"objRef": 3}, "enumerable": false, "configurable": true, "writable": true}]},\
   {"obj": 3, "[Prototype]": {"extern": "Object.prototype"}, "extensible": true, "props": [ \
    {"data": "constructor", "value": {"objRef": 2}, "enumerable": false, "configurable": true, "writable": true}]},\
   {"func":4, "[Prototype]": {"extern": "Function.prototype"}, "name": "bar", "src": "function bar() {return \\\"bar\\\"}", "extensible": true, "props": []}\
  ]');
   
 
