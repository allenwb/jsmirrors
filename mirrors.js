//JavaScript mirror-based reflection prototype
//The interfaces are defined in mirrorsInterfaceSpec.js

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


var Mirrors = function() {
   var Obj = {};
   var has__proto__ = Obj.__proto__ !== undefined;
   ["create", "defineProperty","getOwnPropertyDescriptor", "isExtensible","getPrototypeOf",
    "getOwnPropertyNames", "keys", "preventExtensions", "seal","freeze"]
      .forEach(function(p) {Obj[p]=Object[p]});  //protect built-ins
   var isArray = Array.isArray;
   var serialNumber = 0;
   function has(obj,key) {return Obj.getOwnPropertyDescriptor(obj,key)!==undefined};
   function whoOwns(obj,key) {
      while (obj) {
         if (Obj.getOwnPropertyDescriptor(obj,key) !== undefined) break;
         obj=Obj.getPrototypeOf(obj);
      }
      return obj;
   };
   function inheritedGetter(obj,name) {
      return Obj.getOwnPropertyDescriptor(whoOwns(obj,name),name).get;
   }
      

//Base Introspection Mirrors

   var objBasicMirrorProto = {
      //Implements objectBasicMirrorInterface
      sameAs: function(other) {return other.__obj && this.__obj === other.__obj},
      get typeof () {return typeof this.__obj},
      toString: function() {return "Object Basic Local Mirror #"+this.__id}
   };
   
   var objMirrorProto = Obj.create(objBasicMirrorProto, {
      //Implements objectMirrorInterface
      prototype: {get: function  () {return this.__createObjMirrorOn(Obj.getPrototypeOf(this.__obj))}},
      extensible: {get: function () {return Obj.isExtensible(this.__obj)}},
      ownProperties: {get: function () {
         return this.ownPropertyNames.map(function(key) {return this.prop(key)}.bind(this));
      }},
      ownPropertyNames: {get: function () {return Obj.getOwnPropertyNames(this.__obj)}},
      keys: {get: function  () {return Obj.keys(this.__obj)}},
      enumerationOrder: {get: function () {
         var names = this.keys;
         var seen = Obj.create(null);
         names.forEach(function(n){ seen[n]=n});
         var obj=this.prototype;
         while(obj) {
            obj.keys.forEach(function(n) {if (!seen[n]) names.push(seen[n]=n)});
            obj=obj.prototype;
         }
         return names;
       }},
      prop: {value: function(name) {
         var obj = this.__obj;
         var desc = Obj.getOwnPropertyDescriptor(obj,name);
         if (desc===undefined) return undefined;
         return this.__createPropMirrorOn(this,name);
      }},
      lookup: {value: function(name) {
         var p=this.prop(name);
         if (p) return p;
         var parent = this.prototype;
         if (parent) return parent.lookup(name);
         return undefined;
      }},
      has: {value: function(name) {return this.lookup(name) !==undefined}},
      hasOwn: {value: function(name) {return this.prop(name) !==undefined}},
      specialClass: {get: function() {return {}.toString.call(this.__obj).split(/\s|]/)[1]}},
      toString: {value: function() {return "Object Introspection Mirror #"+this.__id}}
   });

   function mixinFunctionLocalMirror(proto) {
      return Obj.create(proto,{
         //Implements functionMirrorInterface
         name: {get: function() {return this.__obj.name}},
         source: {get: function() {return this.__obj.toString()}},
         isBuiltin: {get: function() {return this.__obj.toString().match(/\)\s*\{\s*\[native code\]\s*\}/)!==null}},
         toString: {value: function() {return "Function Introspection Mirror #"+this.__id}}
       });
    };
   
   var functionMirrorProto = mixinFunctionLocalMirror(objMirrorProto);
         
   var propertyMirrorProto = {
      //Implements propertyMirrorInterface
      get definedOn () {return this.__in},
      get name () {return this.__key},
      isAccessor: false,
      isData: false,
      get configurable () {return Obj.getOwnPropertyDescriptor(this.__obj,this.__key).configurable},
      get enumerable () {return Obj.getOwnPropertyDescriptor(this.__obj,this.__key).enumerable},
      toString: function() {return "Property Introspection Mirror name: "+this.__key+ " #"+this.__id}
   };
   
   var accessorPropertyMirrorProto  = Obj.create(propertyMirrorProto, {
      //Implements accessorPropertyMirrorInterface
      isAccessor: {value: true},
      getter: {get: function() {return this.__in.__createObjMirrorOn(Obj.getOwnPropertyDescriptor(this.__obj,this.__key).get)}},
      setter: {get: function() {return this.__in.__createObjMirrorOn(Obj.getOwnPropertyDescriptor(this.__obj,this.__key).set)}},
      toString: {value: function() {return "Accessor Property Introspection Mirror name: "+this.__key+ " #"+this.__id}}
    });
      
    var dataPropertyMirrorProto  = Obj.create(propertyMirrorProto, {
      //Implements dataPropertyMirrorInterface
      isData: {value: true},
      writable: {get: function() {return Obj.getOwnPropertyDescriptor(this.__obj,this.__key).writable}},
      value: {get: function() {return this.__in.__createObjMirrorOn(Obj.getOwnPropertyDescriptor(this.__obj,this.__key).value)}},
      toString: {value: function() {return "Data Property Introspection Mirror name: "+this.__key+ " #"+this.__id}}
    });

   function reflectedValue(mirror) {
      if (mirror===null) return null;
      var type = typeof mirror;
      if (type==='undefined' || type==='number' || type==='boolean' || type==='string') return mirror;
      return mirror.__obj;
    };
    
    var introspectionMirrorProto = Obj.create(objMirrorProto,{
       __createObjMirrorOn: {value: createIntrospectionMirrorOn},
       __createPropMirrorOn: {value: createPropertyIntrospectionMirrorOn}
    });
 
     var introspectionMirrorFunctionProto = Obj.create(functionMirrorProto,{
       __createObjMirrorOn: {value: createIntrospectionMirrorOn},
       __createPropMirrorOn: {value: createPropertyIntrospectionMirrorOn}
    });

   function createObjectMirrorOn(obj,proto, functionProto) {
      var type = typeof obj;
      if (obj===null) return null;
      if (type==='object') return Obj.create(proto,{__obj:{value:obj},__id: {value: serialNumber++}});
      if (type==='function') return Obj.create(functionProto,{__obj:{value:obj},__id: {value: serialNumber++}});
      if (type==='undefined' || type==='number' || type==='boolean' || type==='string')
         return obj;
      return Obj.create(proto,{__obj:{value:obj},__id: {value: serialNumber++}});
    };
    
    function createIntrospectionMirrorOn(obj) {
       return createObjectMirrorOn(obj,introspectionMirrorProto,introspectionMirrorFunctionProto);
    };
    
    function createPropertyIntrospectionMirrorOn(objMirror,name) {
      var obj = objMirror.__obj;
      var proto = has(Obj.getOwnPropertyDescriptor(obj,name),'value')?dataPropertyMirrorProto:accessorPropertyMirrorProto;
      return Obj.create(proto,{
         __in: {value: objMirror},
         __key: {value: name},
         __obj: {value:obj},
         __id: {value: serialNumber++}
         });
    };

//------------------------------------------------------------------------------
//--- local object Instrospect+mutation mirrors

   var objMutableMirrorProto = Obj.create(objMirrorProto, {
      //implements objectMirrorInterface + objectMutableMirrorInterface
      prototype: {get: inheritedGetter(objMirrorProto,"prototype"), set: function (p) {
         if (has__proto__) this.__obj.__proto__=reflectedValue(p);
         else throw new Error("Changing an object's prototype is not allowed");}},
      extensible:{get: inheritedGetter(objMirrorProto,"extensible"), set: function (b) {
         if (!this.extensible && b) throw Error("A non-extensible object cannot be made extensible");
         if (!b) Obj.preventExtensions(this.__obj)}},
      seal: {value: function () {Obj.seal(this.__obj); return this;}},
      freeze: {value: function () {Obj.freeze(this.__obj); return this;}},
      addProperty: {value: function(name, descriptor) {
         if (this.hasOwn(name)) throw Error('Property "'+name+'" already exists');
         if (!this.extensible ) throw Error("Can't add property to a non-extensible object");
         var desc = { };
         for (var p in descriptor) desc[p]=reflectedValue(descriptor[p]);        
         Obj.defineProperty(this.__obj,name,desc);
         return this.__createPropMirrorOn(this,name);
      }},
      toString: {value:function() {return "Object Introspection+Mutation Mirror #"+this.__id}}
   });
   
   function mixinFunctionLocalMutableMirror(proto) {
      return Obj.create(proto,{
         //Implements functionMutableMirrorInterface
         name: {get: inheritedGetter(proto,"name"),
                set: function() {throw Error("The name of a local function is immutable")}},
         source: {get: inheritedGetter(proto,"source"),
                  set: function() {throw Error("The source code of a local function is immutable")}},
         toString: {value: function() {return "Function Introspection+Mutation Mirror #"+this.__id}}
       });
    };
    
   function mixinMutablePropertyMirror(proto) {
      return Obj.create(proto,{
         //Implements propertyMutableMirrorInterface
		 delete: {value: function (strict) {
		        if (!this.__in) throw Error("Property already deleted");
		        var result;
		        if (strict)
		           (function() {"use strict"; result= delete this.__in[this.__key]})();
		        else result= delete this.__in[this.__key];
		        if (result) this.__in = undefined;
		        return result;
		 }},
		 name: {
		     get: inheritedGetter(proto,"name"),
		     set: function (p) {
		        if (Obj.getOwnPropertyDescriptor(this.__in.__obj,p))
		           throw Error("Can't rename a property to an existing own property name");
		         var desc = Obj.getOwnPropertyDescriptor(this.__in.__obj,this.__key);
		         if (desc && !desc.configurable)
		            throw Error("Can't rename a non-configurable property");
		         Obj.defineProperty(this.__in.__obj,p,desc);
		         delete this.__in.__obj[this.__key];
		         this.__key=p;		         
		     }
		 },
		 enumerable: {
		     get: inheritedGetter(proto,"enumerable"),
		     set: function (p) {Obj.defineProperty(this.__in.__obj,this.__key,{enumerable: !!p})}
		 },
		 configurable: {
		     get: inheritedGetter(proto,"configurable"),
		     set: function (p) {Obj.defineProperty(this.__in.__obj,this.__key,{configurable: !!p})}
		 },
         toString: {value: function() {return "Property Introspection+Mutation Mirror #"+this.__id}}
       });
    };
    
   function mixinMutableDataPropertyMirror(proto) {
      return Obj.create(mixinMutablePropertyMirror(proto),{
         //Implements dataPropertyMutableMirrorInterface
		 writable: {
		     get: inheritedGetter(proto,"writable"),
		     set: function (p) {Obj.defineProperty(this.__in.__obj,this.__key,{writable: !!p})}
		 },
		 value: {
		     get: inheritedGetter(proto,"value"),
		     set: function (p) {Obj.defineProperty(this.__in.__obj,this.__key,{value: reflectedValue(p)})}
		 },
		 becomeAccessorProperty: {value: function(get,set) {
		     var desc = Obj.getOwnPropertyDescriptor(this.__in.__obj,this.__key);
		     if (!desc && !desc.configurable)
		         throw Error("Can't mutate a non-configurable property");
		     delete desc.value;
		     delete desc.writable;
		     desc.get = reflectedValue(get);
		     desc.set = reflectedValue(set);
		     Obj.defineProperty(this.__in.__obj,this.__key,desc);
		     return this.__in.prop(this.__key);
         }},		    
         toString: {value: function() {return "Data Property Introspection+Mutation Mirror #"+this.__id}}
       });
    };   

   function mixinMutableAccessorPropertyMirror(proto) {
      return Obj.create(mixinMutablePropertyMirror(proto),{
         //Implements accessorPropertyMutableMirrorInterface
		 getter: {
		     get: inheritedGetter(proto,"setter"),
		     set: function (p) {Obj.defineProperty(this.__in.__obj,this.__key,{get: reflectedValue(p)})}
		 },
		 setter: {
		     get: inheritedGetter(proto,"getter"),
		     set: function (p) {Obj.defineProperty(this.__in.__obj,this.__key,{set: reflectedValue(p)})}
		 },
		 becomeDataProperty: {value: function(value,writable) {
		     var desc = Obj.getOwnPropertyDescriptor(this.__in.__obj,this.__key);
		     if (!desc && !desc.configurable)
		         throw Error("Can't mutate a non-configurable property");
		     delete desc.get;
		     delete desc.set;
		     desc.value = reflectedValue(value);
		     desc.writable = !!writable;
		     Obj.defineProperty(this.__in.__obj,this.__key,desc);
		     return this.__in.prop(this.__key);
         }},		    
         toString: {value: function() {return "Accessor Property Introspection+Mutation Mirror #"+this.__id}}
       });
    };   

    var dataPropertyMutableMirrorProto = mixinMutableDataPropertyMirror(dataPropertyMirrorProto);
    var accessorPropertyMutableMirrorProto = mixinMutableAccessorPropertyMirror(accessorPropertyMirrorProto);
    
    var mutableFactoryDescriptor = {
          __createObjMirrorOn: {value: createMutationMirrorOn},
          __createPropMirrorOn: {value: createPropertyMutationMirrorOn}
          };
          
    var mutableLocalMirrorProto = Obj.create(objMutableMirrorProto,mutableFactoryDescriptor); 
    var mutableLocalFunctionMirrorProto = Obj.create(
       mixinFunctionLocalMutableMirror(mixinFunctionLocalMirror(objMutableMirrorProto)),
       mutableFactoryDescriptor);
    
    function createMutationMirrorOn(obj) {
       return createObjectMirrorOn(obj,mutableLocalMirrorProto,mutableLocalFunctionMirrorProto);
    };

    function createPropertyMutationMirrorOn(objMirror,name) {
      var obj = objMirror.__obj;
      var proto = has(Obj.getOwnPropertyDescriptor(obj,name),'value')?dataPropertyMutableMirrorProto:accessorPropertyMutableMirrorProto;
      return Obj.create(proto,{
         __in: {value: objMirror},
         __key: {value: name},
         __obj: {value:obj},
         __id: {value: serialNumber++}
         });
    };
    
//------------------------------------------------------------------------------
//--- local object evaluation  mixins mirrors

   function mixinObjectEval(proto) {
      return Obj.create(proto,{
         put: {value: function (name, value,strict) {
            value=reflectedValue(value);
            var target=this.__obj;
            if (strict) (function() {"use strict";target[name]=value})();
            else target[name]=value;
         }},
         get: {value: function (name) {return this.__createObjMirrorOn(this.__obj[name])}},
         invoke: {value: function(name,arg0) {
            var func = reflectedValue(this.get(name));
            return this.__createObjMirrorOn(func.apply(this.Obj,[].slice.call(arguments,1).map(function(v){return reflectedValue(v)})));
         }},
         toString: {value:function() {return "Object Introspection+Eval Mirror #"+this.__id}}
       });
    };

   function mixinFunctionEval(proto) {
      return Obj.create(proto,{
         apply: {value: function(thisValue,argsMirror) {
            var func = this.__obj;
            var args;
            if (isArray(argsMirror)) args = argsMirror.map(function(v){return reflectedValue(v)});
            else args =reflectedValue(argsMirror);
            return this.__createObjMirrorOn(func.apply(reflectedValue(thisValue),args));
         }},  
         call: {value: function(thisValue,arg0) {
            var func = this.__obj;
            return this.__createObjMirrorOn(func.apply(reflectedValue(thisValue),[].slice.call(arguments,1).map(function(v){return reflectedValue(v)})));
         }},
         toString: {value: function() {return "Function Introspection+Eval Mirror #"+this.__id}}
       });
    };


//------------------------------------------------------------------------------
//--- local object evaluation only mirrors

    var introspectionEvalOnlyMirrorProto = Obj.create(mixinObjectEval(objBasicMirrorProto),{
       __createObjMirrorOn: {value: createEvaluationMirrorOn},
       toString: {value:function() {return "Object Evaluation Mirror #"+this.__id}}
    });

     var introspectionEvalOnlyMirrorFunctionProto = Obj.create(mixinFunctionEval(mixinObjectEval(objBasicMirrorProto)),{
       __createObjMirrorOn: {value: createEvaluationMirrorOn},
       toString: {value: function() {return "Function Evaluation Mirror #"+this.__id}}
    });

    function createEvaluationMirrorOn(obj) {
       return createObjectMirrorOn(obj,introspectionEvalMirrorProto,introspectionEvalMirrorFunctionProto);
    };


//------------------------------------------------------------------------------
//--- local object Instrospect+evaluation mirrors

    var introspectionEvalMirrorProto = Obj.create(mixinObjectEval(introspectionMirrorProto),{
       __createObjMirrorOn: {value: createIntrospectionEvalMirrorOn},
       toString: {value:function() {return "Object Introspection+Eval Mirror #"+this.__id}}
    });

     var introspectionEvalMirrorFunctionProto = Obj.create(mixinFunctionEval(mixinObjectEval(introspectionMirrorFunctionProto)),{
       __createObjMirrorOn: {value: createIntrospectionEvalMirrorOn},
       toString: {value: function() {return "Function Introspection+Eval Mirror #"+this.__id}}
    });

    function createIntrospectionEvalMirrorOn(obj) {
       return createObjectMirrorOn(obj,introspectionEvalMirrorProto,introspectionEvalMirrorFunctionProto);
    };
 
//------------------------------------------------------------------------------
//--- local object introspection+mutation+evaluation mirrors
    var introspectionMutationEvalMirrorProto = Obj.create(mixinObjectEval(mutableLocalMirrorProto),{
       __createObjMirrorOn: {value: createMutableEvalMirrorOn},
       toString: {value:function() {return "Local Object Full Access Mirror #"+this.__id}}
    });

     var introspectionEvalMirrorFunctionProto = Obj.create(mixinFunctionEval(mixinObjectEval(mutableLocalFunctionMirrorProto)),{
       __createObjMirrorOn: {value: createIntrospectionEvalMirrorOn},
       toString: {value:function() {return "Local Function Full Access Mirror #"+this.__id}}
    });

    function createMutableEvalMirrorOn(obj) {
       return createObjectMirrorOn(obj,introspectionMutationEvalMirrorProto,introspectionEvalMirrorFunctionProto);
    };

 
 //------------------------------------------------------------------------------
 //--- introspection mirrors on an object model of descriptions of a domain of externally defined objects.
 //--- The object mode can be read/written using JSON encoding
 
   function getJSONPropertyDescriptor (objMirror,name) {
	  var desc;
	  objMirror.__domain[objMirror.__ser].props.some(function(p) {
		 return (p.data===name||p.accessor===name)?(desc=p):false});
	  return desc;
   }
 
   var jsonObjMirrorProto = Obj.create(objMirrorProto, {
      prototype: {get: function () {return this.__createObjMirrorOn([this.__domain,this.__domain[this.__ser]["[Prototype]"]])}},
      extensible:{get: function () {return this.__domain[this.__ser].extensible===true}},
      // inherited: get ownProperties () {},
      ownPropertyNames: {get: function () {return this.__domain[this.__ser].props
            .map(function(prop) {return prop.data || prop.accessor})}},
      keys: {get: function () {return this.ownPropertyNames.filter(function(n) {return this.prop(n).enumerable}.bind(this))}},
      prop: {value: function(name) {
         return this.__createPropMirrorOn(this,name);
      }},
      // inherited: lookup: function(name) {},
      typeof: {get: function () {return "object"}},
      specialClass: {get: function () {
         var c = this.__domain[this.__ser].special;
         return c?c:"Object";
      }},
      sameAs: {value:function(other) {
         return this.__domain === other.__domain && this.__ser === other.__ser}},
      toString: {value:function() {return "JSON Object Introspection Mirror #"+this.__id+" on object "+this.__ser}}
   });
   
   function mixinFunctionJSONMirror(proto) {
      return Obj.create(proto,{
         typeof: {get: function () {return "function"}},
         name: {get: function() {return this.__domain[this.__ser].name}},
         source: {get: function() {return this.__domain[this.__ser].src}},
         specialClass: {value: "Function"},
         isBuiltin: {get: function() {return false}},
         toString: {value: function() {return "JSON Function Introspection Mirror #"+this.__id+" on object "+this.__ser}}
       });
    };
   
   var jsonFunctionMirrorProto = mixinFunctionJSONMirror(jsonObjMirrorProto);
         
   var jsonAccessorPropertyMirrorProto  = Obj.create(accessorPropertyMirrorProto, {
      getter: {get: function() {return this.__in.__createObjMirrorOn([this.__in.__domain,this.__desc.get])}},
      setter: {get: function() {return this.__in.__createObjMirrorOn([this.__in.__domain,this.__desc.set])}},
      configurable: {get: function () {return this.__desc.configurable===true}},
      enumerable: {get: function () {return this.__desc.enumerable===true}},
      toString: {value: function() {return "JSON Accessor Property Introspection Mirror name: "+this.__key+ " #"+this.__id}}
    });
      
    var jsonDataPropertyMirrorProto  = Obj.create(dataPropertyMirrorProto, {
      writable: {get: function() {return this.__desc.writable===true}},
      value: {get: function() {return this.__in.__createObjMirrorOn([this.__in.__domain,this.__desc.value])}},
      configurable: {get: function () {return this.__desc.configurable===true}},
      enumerable: {get: function () {return this.__desc.enumerable===true}},
      toString: {value: function() {return "JSON Data Property Introspection Mirror name: "+this.__key+ " #"+this.__id}}
    });
    
  function createJSONObjectMirrorOn(domainRef /*domain refObj*/ , proto,functionProto) {
      var domain,ref;
      var type = typeof domainRef;
      var newSer,isObjDef,isfuncDef;
      if (domainRef===null) return null;
      if (type==='undefined' || type==='number' || type==='boolean' || type==='string')
         return domainRef;
      if (type==='object') {
         domain=domainRef[0];
         ref=domainRef[1];
         type = typeof ref;
         if (ref===null) return null;
         if (type==='undefined' || type==='number' || type==='boolean' || type==='string')
         return ref;
         if (has(ref,'objRef')) {
            if (has(domain[ref.objRef],'func'))
               return Obj.create(functionProto,{__domain: {value: domain}, __ser: {value: ref.objRef},__id: {value: serialNumber++}});
            else return Obj.create(proto,{__domain: {value: domain}, __ser: {value: ref.objRef}, __id: {value: serialNumber++}});
         } else if (has(ref,'extern'))
            return createIntrospectionMirrorOn(eval(ref.extern));
         else if ((isObjDef=has(ref,'obj')) || (isFuncDef=has(ref,'func'))) {
            newSer=domain.length;
            if (isObjDef) ref.obj=newSer;else ref.func=newSer;
            ref.props = [];
            domain.push(ref);
            return createJSONObjectMirrorOn([domain,{objRef:newSer}],proto,functionProto);
        }
      }
      throw "unknown serialization tag: "+JSON.stringify(ref);
    };
    
  function jsonReflectedValue(mirror) {
      if (mirror===null) return null;
      var type = typeof mirror;
      if (type==='undefined' || type==='number' || type==='boolean' || type==='string') return mirror;
      return {objRef: mirror.__ser};
    };


   function createJSONPropertyMirrorOn(objMirror,name) {
      var desc = getJSONPropertyDescriptor(objMirror,name);
      if (desc===undefined) return undefined;
      var name = desc.data || desc.accessor;
      return Obj.create(has(desc,'data')?jsonDataPropertyMirrorProto
                                        :jsonAccessorPropertyMirrorProto,{
         __in: {value: objMirror},
         __key: {value: name},
         __desc:{value: desc},
         __id: {value: serialNumber++}
         });
    };
        
    var JSONFactoryDescriptor = {
          __createObjMirrorOn: {value: createJSONIntrospectionMirrorOn},
          __createPropMirrorOn: {value: createJSONPropertyMirrorOn}
          };
          
    var jsonIntrospectionMirrorProto = Obj.create(jsonObjMirrorProto,JSONFactoryDescriptor);
    var jsonIntrospectionMirrorFunctionProto = Obj.create(jsonFunctionMirrorProto,JSONFactoryDescriptor);

    function createJSONIntrospectionMirrorOn(obj) {
       return createJSONObjectMirrorOn(obj,jsonIntrospectionMirrorProto,jsonIntrospectionMirrorFunctionProto);
    };
  
    
//------------------------------------------------------------------------------
//--- JSON object Instrospect+mutation mirrors

   var jsonObjMutableMirrorProto = Obj.create(jsonObjMirrorProto, {
      //implements objectMirrorInterface + objectMutableMirrorInterface
      prototype: {get: inheritedGetter(jsonObjMirrorProto,"prototype"), set: function (p) {
         this.__domain[this.__ser]["[Prototype]"]=jsonReflectedValue(p);}},
      extensible:{get: inheritedGetter(jsonObjMirrorProto,"extensible"), set: function (b) {
         this.__domain[this.__ser].extensible = !!b;}},
      seal: {value: function () {
         this.__domain[this.__ser].props
            .forEach(function(prop) {prop.configurable =  true});
         this.__domain[this.__ser].extensible = false;
         return this;}},
      freeze: {value: function () {
         this.__domain[this.__ser].props
            .forEach(function(prop) {prop.configurable = false; if (has(prop,"writable")) prop.writable=false;}); 
         this.__domain[this.__ser].extensible = false;
         return this;}},
      addProperty: {value: function(name, descriptor) {
         if (this.hasOwn(name)) throw Error('Property "'+name+'" already exists');
         var desc;
         if (has(descriptor,'get') || has(descriptor,'set') )
            desc = {accessor: name, get: undefined, set: undefined, enumerable: false, configurable: false};
         else desc = {data: name, value: undefined, writable: false, enumerable: false, configurable: false};
         for (var p in descriptor) desc[p]=jsonReflectedValue(descriptor[p]);
         this.__domain[this.__ser].props.push(desc);
         return this.__createPropMirrorOn(this,name);
      }},
      toString: {value:function() {return "JSON Object Introspection+Mutation Mirror #"+this.__id+" on object "+this.__ser}}
   });
   
   function mixinFunctionJSONMutableMirror(proto) {
      return Obj.create(proto,{
         //Implements functionMutableMirrorInterface
         name: {get: inheritedGetter(proto,"name"),
                set: function(n) {this.__domain[this.__ser].name=jsonReflectedValue(n)}},
         source: {get: inheritedGetter(proto,"source"),
                  set: function(s) {this.__domain[this.__ser].src=jsonReflectedValue(s)}},
         toString: {value: function() {return "JSON Function Introspection+Mutation Mirror #"+this.__id+" on object "+this.__ser}}
       });
    };

   function mixinMutableJSONPropertyMirror(proto) {
      return Obj.create(proto,{
         //Implements propertyMutableMirrorInterface
		 delete: {value: function (strict) {
		        //in JSON modeled object we always permit deletes so strict arg is ignored
		        if (!this.__in) throw Error("Property already deleted");
		        var obj = this.__in;
		        var oldProps = obj.__domain[obj.__ser].props;
		        var name=this.name;
		        newProps = oldProps.filter(function (p) {return p.data!==name && p.accessor!=name});
		        obj.__domain[obj.__ser].props = newProps;
		        this.__in = undefined;
		        this.__desc = undefined;
		        return true;
		 }},
		 name: {
		     get: inheritedGetter(proto,"name"),
		     set: function (p) {
		        if (this.__in.hasOwn(p))
		           throw Error("Can't rename a property to an existing own property name");
		         var desc = this.__desc;
		         if (desc.data) desc.data=p; else desc.accessor=p;
		     }
		 },
		 enumerable: {
		     get: inheritedGetter(proto,"enumerable"),
		     set: function (p) {this.__desc.enumerable = !!p}},
		 configurable: {
		     get: inheritedGetter(proto,"configurable"),
		     set: function (p) {this.__desc.configurable = !!p}},
         toString: {value: function() {return "JSON Property Introspection+Mutation Mirror #"+this.__id}}
       });
    };


   function mixinMutableJSONDataPropertyMirror(proto) {
      return Obj.create(mixinMutableJSONPropertyMirror(proto),{
         //Implements dataPropertyMutableMirrorInterface
		 writable: {
		     get: inheritedGetter(proto,"writable"),
		     set: function (p) {this.__desc.writable = !!p}},
		 value: {
		     get: inheritedGetter(proto,"value"),
		     set: function (p) {this.__desc.value = JSONreflectedValue(p)}},
		 becomeAccessorProperty: {value: function(get,set) {
		     var desc = this.__desc;
		     delete desc.value;
		     delete desc.writable;
		     desc.accessor=desc.data;
		     delete desc.data;
		     desc.get = jsonReflectedValue(get);
		     desc.set = jsonReflectedValue(set);
		     return this.__in.prop(this.__key);
         }},		    
         toString: {value: function() {return "JSON Data Property Introspection+Mutation Mirror #"+this.__id}}
       });
    };   

   function mixinMutableJSONAccessorPropertyMirror(proto) {
      return Obj.create(mixinMutablePropertyMirror(proto),{
         //Implements accessorPropertyMutableMirrorInterface
		 getter: {
		     get: inheritedGetter(proto,"setter"),
		     set: function (p) {this.__desc.get =  jsonReflectedValue(p)}},
		 setter: {
		     get: inheritedGetter(proto,"getter"),
		     set: function (p) {this.__desc.set =  jsonReflectedValue(p)}},
		 becomeDataProperty: {value: function(value,writable) {
		     var desc = this.__desc;
		     delete desc.get;
		     delete desc.set;
		     desc.data=desc.accessor;
		     delete desc.accessor;
		     desc.value = jsonReflectedValue(value);
		     desc.writable = !!writable;
		     return this.__in.prop(this.__key);
         }},		    
         toString: {value: function() {return "JSON Accessor Property Introspection+Mutation Mirror #"+this.__id}}
       });
    };
    
    
   var jsonDataPropertyMutableMirrorProto = mixinMutableJSONDataPropertyMirror(jsonDataPropertyMirrorProto);
   var jsonAccessorPropertyMutableMirrorProto = mixinMutableJSONAccessorPropertyMirror(jsonAccessorPropertyMirrorProto);
   
   function createJSONPropertyMutationMirrorOn(objMirror,name) {
      var desc = getJSONPropertyDescriptor(objMirror,name);
      if (desc===undefined) return undefined;
      var name = desc.data || desc.accessor;
      return Obj.create(has(desc,'data')?jsonDataPropertyMutableMirrorProto
                                        :jsonAccessorPropertyMutableMirrorProto,{
         __in: {value: objMirror},
         __key: {value: name},
         __desc:{value: desc},
         __id: {value: serialNumber++}
         });
    };


    var mutableJSONFactoryDescriptor = {
          __createObjMirrorOn: {value: createJSONMutationMirrorOn},
          __createPropMirrorOn: {value: createJSONPropertyMutationMirrorOn }
          };
           
    var jsonMutationMirrorProto = Obj.create(jsonObjMutableMirrorProto,mutableJSONFactoryDescriptor);
    var jsonMutationMirrorFunctionProto = Obj.create(
       mixinFunctionJSONMutableMirror(mixinFunctionJSONMirror(jsonObjMutableMirrorProto)),
       mutableJSONFactoryDescriptor);
       
    function createJSONMutationMirrorOn(obj) {
       return createJSONObjectMirrorOn(obj,jsonMutationMirrorProto,jsonMutationMirrorFunctionProto);
    };
  


//------------------------------------------------------------------------------
    
      
   var exports = {
      introspect: createIntrospectionMirrorOn,
      mutate: createMutationMirrorOn,
      evaluation: createEvaluationMirrorOn,
      introspectEval: createIntrospectionEvalMirrorOn,
      fullLocal: createMutableEvalMirrorOn,
      introspectJSON: createJSONIntrospectionMirrorOn,
      mutateJSON: createJSONMutationMirrorOn
   };
   return exports;
}();

