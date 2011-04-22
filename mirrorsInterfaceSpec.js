//This is a meta description of the interfaces for a mirror-based reflection facility for JavaScript

//There is no executable code in this file, just interface descriptions

/* ***** BEGIN LICENSE BLOCK *****
 *
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is the Narcissus JavaScript engine.
 *
 * The Initial Developer of the Original Code is
 * Allen Wirfs-Brock <allenwb@mozilla.org>.
 * Portions created by the Initial Developer are Copyright (C) 2011
 * Mozilla Corp. All Rights Reserved.
 *
 * Contributor(s):
 *   Allen Wirfs-Brock <allen@mozilla.org>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

// meta function for ad hoc JavaScript interface specification language
function getAccess(returnInterface) {}; //a "getable" property
function setAccess(valueInteface) {};   //a "putable" property
function method(arguments,returnInterface){}; // a method property
function constant(valueInterfae) {};    // a constant valued "getable" property
function extendsInterface(supers, members) {}; //define interface that extends others
function returns(returnInterface) {};   //return value of a method
function Rest(valueInterface) {};  //expected type of "rest" arguments
function array(elementInterface) {};  //expects an array whose elements support the argument interface


//JavaScript Mirror Interfaces

//--------------- Base Object Introspection Mirrors ---------------------------------

//Basic testing common to all object mirrors 
var objectBasicMirrorInterface = {
   sameAs: method({other: objectBasicMirrorInterface}, returns(Boolean)),
      //is this and the argument both mirrors on the same object?
   typeof: getAccess(String),
      //return a string which is the value returned by typeof when applied to the reflected object
};

//Mirror for introspect upon all objects
var objectMirrorInterface = extendsInterface(objectBasicMirrorInterface, {
   prototype:  getAccess(objectMirrorInterface|null),
      //return a mirror on the reflected object's [[Prototype]]
   extensible: getAccess(Boolean),
      //return true if the reflected object is extensible
   ownProperties: getAccess(array(propertyMirrorInterface)),
      //return an array containing properties mirrors on the reflected object's own properties
   ownPropertyNames: getAccess(array(String)),
      //return an array containing the string names of the reflected object's own properties
   keys: getAccess(array(String)),
      //return an array containing the string names of the reflected object's enumerable own properties
   enumerationOrder: getAccess(array(String)),
      //return an array containing the string names of the reflected object's enumerable own and inherited properties
   prop: method({name:String}, returns(propertyMirrorInterface|undefined)),
      //return a mirror on an own property
   lookup: method({name:String}, returns(propertyMirrorInterface|undefined)),
      //return a mirror on the result of a property lookup.  It may be an inherited property
   has: method({name:String}, returns(Boolean)),
      //return true if the reflected object has a property named 'name'
   hasOwn: method({name:String}, returns(Boolean)),
      //return true if the reflected object has an own property named 'name'
   specialClass: getAccess(String)
      //return a string which is the value of the reflected object's [[Class]] internal property
});

//primitive values (undefined, null, numbers, strings, booleans) are reflected as themselves.

//Introspection mirror for  function objects
var functionMirrorInterface = extendsInterface(objectMirrorInterface, {
   name:   getAccess(String|undefined),
      //return the declared name of the function or undefined if it is an anonymous function 
   source: getAccess(String|undefined),
      //return the source code of the function or undefined if the source is not available
   isBuiltin: getAccess(Boolean)
      //return true if this is a builtin or host function that was not defined using JavaScript code
});

//Mirror common to all properties
var propertyMirrorInterface = {
      definedOn: getAccess(objectMirrorInterface),
         //return a Mirror on the object that has this as an own property
      name: getAccess(String),
         //return the string value that is key used to access this property
      isAccessor: constant(false),
         //return whether or not this is an Accessor property
      isData: constant(false),
         //return whether or not this is a Data property
      configurable: getAccess(Boolean),
         //return the value of the [[Configurable]] attributed of the reflected property
      enumerable: getAccess(Boolean),
         //return the value of the [[Enumerable]] attributed of the reflected property
};

//Extended Mirror for data properties
var dataPropertyMirrorInteface  = extendsInterface(propertyMirrorInterface, {
      isData: constant(true),
         //return whether or not this is a Data property
      isWritable: getAccess(Boolean),
         //return the value of the [[Writable]] attributed of the reflected property
      value: getAccess(objectMirrorInterface)
         //return a  mirror on the value of the reflected property's [[Value]] attribute
});

//Extended Mirror interface for accessor properties
var accessorPropertyMirrorInteface  = extendsInterface(propertyMirrorInterface, {
      isAccessor: constant(true),
         //return whether or not this is an Accessor property
      getter: getAccess(functionMirrorInterface | undefined),
         //return a function mirror on the value of the reflected property's [[Get]] attribute
      setter: getAccess(functionMirrorInterface | undefined)
         //return a function mirror on the value of the reflected property's [[Set]] attribute
});

//Mirror interface for property descriptors
var propertyDescriptorInterface = {
      //follow the same rules as native property descritpros except that value, get, and set have mirror values
   enumerable: getAccess(Boolean|undefined),
   configurable: getAccess(Boolean|undefined),
   value: getAccess(objectMirrorInterface|undefined),
   writable: getAccess(Boolean|undefined),
   get: getAccess(functionMirrorInterface|undefined),
   set: getAccess(functionMirrorInterface|undefined)
};


//---------------  Mutation Mirrors Extending Base Object Mirrors------------------------

//These interfaces support the modification of reflected objects and properties.

//Inteface for modify the definition of a reflected object
var objectMutableMirrorInterface = extendsInterface(objectMirrorInterface,{
   prototype: setAccess(objectMirrorInterface),
      //set the [[Prototype]] of the reflected object the object reflected by the argument
   extensible: setAccess(Boolean),
      //set the [[Extenisble]] internal property of the reflected object to the value of the argument
   addProperty: method([{name:String}, {descriptor: propertyDescriptorInterface}],
                       returns(propertyMirrorInterface+propertyMutableMirrorInterface)),
      //create a new own property on the reflected object, throw an error if it already exists
   seal: method([],returns(objectMutableMirrorInterface)),
      //seal the reflected object
   freeze: method([],returns(objectMutableMirrorInterface))
      //freeze the reflected object
});

//Inteface for modify the definition of a reflected function
var functionMutableMirrorInterface = extendsInterface(
   [objectMutableMirrorInterface,functionMirrorInterface], {
   name:   setAccess(String),
      //set the name of the reflected function to the argument value
   source: setAccess(String),
      //set the source code of the reflected function to the argument value, thrown an error if source is not valid JavaScript function
});

//Inteface for modifying the aspects of a reflected property that are common to all properites.
var propertyMutableMirrorInterface = {
   delete: method([{strict: Boolean}],returns(Boolean)),
      //delete the reflected property from the object that owns it.  Return the result of the [[Delete]] operation
   name: setAccess(String),
      //change the name used to access the reflected property on its own object to the argument value
   enumerable: setAccess(Boolean),
      //set the reflected property's [[Enumerable]] attribute to true
   configurable: setAccess(Boolean)
      //set the reflected property's [[Configurable]] attribute to true
};

//Inteface for modifying the aspects of a reflected property that are specific to accessor properites.
var accessorPropertyMutableMirrorInterface = extendsInterface(
      [accessorPropertyMirrorInteface,propertyMutableMirrorInterface] ,{
      getter: setAccess(functionMirrorInterface | undefined),
         //set the reflected property's [[Set]] attribute to the value reflected by the argument
      setter: setAccess(functionMirrorInterface | undefined),
         //set the reflected property's [[Get]] attribute to the value reflected by the argument
      becomeDataProperty: method([{value: objectMirrorInterface}, {writable: Boolean} ],
                                 returns(dataPropertyMutableMirrorInterface))
        //turn this property into a Data property and return a new mirror on it
});

//Inteface for modifying the aspects of a reflected property that are specific to data properites.
var dataPropertyMutableMirrorInterface = extendsInterface(
      [accessorPropertyMirrorInteface,propertyMutableMirrorInterface] ,{
      writable: setAccess(Boolean),
       //set the reflected property's [[Writable]] attribute to true
     value: setAccess(objectMirrorInterface),
      //set the reflected property's [[Value]] attribute to the value reflected by the argument
     becomeAccessorProperty: method([{get:functionMirrorInterface | undefined},
                                      {set:functionMirrorInterface | undefined} ],
                                    returns(accessorPropertyMutableMirrorInterface))
        //turn this property into a Accessor property and return a new mirror on it
});

//---------------  Evaluation Mirrors Extending Base Object Mirrors------------------------

//These interfaces support actual evaluaton of reflected objects and functions

//evaluate the properties on an reflected object
var objectEvalMirrorInterface = {
   put: method([{name:String}, {value: objectMirrorInterface}, {strict: Boolean, optional: true}]),
      //Do a [[Put]] for the named property on the reflected object using the reflected value of the 'value' argument as the new value
   get: method([{name:String}], returns(objectEvalMirrorInterface)),
      //Do a [[Get]] for the named property on the reflected object and return a mirror on the result
   invoke: method([{name:String}, {args: array(objectMirrorInterface)}],
                  returns(objectEvalMirrorInterface)),
      //Do a [[Get]] for the property and if the value is a function call it using the
      //reflected object as the this value and the reflected element values of 'args' as the
      //function arguments.  Return a mirror on the result of the function call
};

//call a reflected function
var functionEvalMirrorInterface = {
   call: method([{this: objectMirrorInterface}, Rest(objectMirrorInterface)],
                  returns(objectEvalMirrorInterface)),
   apply: method([{this: objectMirrorInterface}, {args: array(objectMirrorInterface)}],
                  returns(objectEvalMirrorInterface))
};



