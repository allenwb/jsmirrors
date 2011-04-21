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
   
   var objMirrorProto = {
      //Implements objectMirrorInterface
      get prototype () {return this.__createObjMirrorOn(Obj.getPrototypeOf(this.__obj))},
      get extensible () {return Obj.isExtensible(this.__obj)},
      get ownProperties () {
         return this.ownPropertyNames.map(function(key) {return this.prop(key)}.bind(this));
      },
      get ownPropertyNames () {return Obj.getOwnPropertyNames(this.__obj)},
      get keys () {return Obj.keys(this.__obj)},
      get enumerationOrder () {
         var names = this.keys;
         var seen = Obj.create(null);
         names.forEach(function(n){ seen[n]=n});
         var obj=this.prototype;
         while(obj) {
            obj.keys.forEach(function(n) {if (!seen[n]) names.push(seen[n]=n)});
            obj=obj.prototype;
         }
         return names;
       },
      prop: function(name) {
         var obj = this.__obj;
         var desc = Obj.getOwnPropertyDescriptor(obj,name);
         if (desc===undefined) return undefined;
         return this.__createPropMirrorOn(this,name);
      },
      lookup: function(name) {
         var p=this.prop(name);
         if (p) return p;
         var parent = this.prototype;
         if (parent) return parent.lookup(name);
         return undefined;
      },
      has: function(name) {return this.lookup(name) !==undefined},
      hasOwn: function(name) {return this.prop(name) !==undefined},
      sameAs: function(other) {return this.__obj === other.__obj},
      get typeof () {return typeof this.__obj},
      get specialClass() {return {}.toString.call(this.__obj).split(/\s|]/)[1]},
      toString: function() {return "Object Introspection Mirror #"+this.__id}
   };

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
      seal: {value: function () { this.__createObjMirrorOn(Obj.seal(this.__obj))}},
      freeze: {value: function () { this.__createObjMirrorOn(Obj.freeze(this.__obj))}},
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
         name: {set: function() {throw Error("The name of a local function is immutable")}},
         source: {set: function() {throw Error("The source code of a local function is immutable")}},
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
//--- local object Instrospect+evaluation mirrors

   function reflectedValue(mirror) {
      if (mirror===null) return null;
      var type = typeof mirror;
      if (type==='undefined' || type==='number' || type==='boolean' || type==='string') return mirror;
      return mirror.__obj;
    };

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

    var introspectionEvalMirrorProto = Obj.create(mixinObjectEval(introspectionMirrorProto),{
       __createObjMirrorOn: {value: createIntrospectionEvalMirrorOn}
    });

     var introspectionEvalMirrorFunctionProto = Obj.create(mixinFunctionEval(mixinObjectEval(introspectionMirrorFunctionProto)),{
       __createObjMirrorOn: {value: createIntrospectionEvalMirrorOn}
    });

    function createIntrospectionEvalMirrorOn(obj) {
       return createObjectMirrorOn(obj,introspectionEvalMirrorProto,introspectionEvalMirrorFunctionProto);
    };
 
//------------------------------------------------------------------------------
//--- local object introspection_mutation+evaluation mirrors
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
   var jsonObjMirrorProto = Obj.create(objMirrorProto, {
      prototype: {get: function () {return this.__createObjMirrorOn([this.__domain,this.__domain[this.__ser]["[Prototype]"]])}},
      extensible:{get: function () {return this.__domain[this.__ser].extensible===true}},
      // inherited: get ownProperties () {},
      ownPropertyNames: {get: function () {return this.__domain[this.__ser].props
            .map(function(prop) {return prop.data || prop.accessor})}},
      keys: {get: function () {return this.ownPropertyNames.filter(function(n) {return this.prop(n).enumerable}.bind(this))}},
      prop: {value: function(name) {
         var desc;
         this.__domain[this.__ser].props.some(function(p) {
            return (p.data===name||p.accessor===name)?(desc=p):false});
         if (desc===undefined) return undefined;
         return this.__createPropMirrorOn(this,desc);
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
   
   var jsonFunctionMirrorProto = Obj.create(jsonObjMirrorProto,{
      typeof: {get: function () {return "function"}},
      name: {get: function() {return this.__domain[this.__ser].name}},
      source: {get: function() {return this.__domain[this.__ser].src}},
      specialClass: {value: "Function"},
      isBuiltin: {get: function() {return false}},
      toString: {value: function() {return "JSON Function Introspection Mirror #"+this.__id+" on object "+this.__ser}}
   });

   var jsonAccessorPropertyMirrorProto  = Obj.create(accessorPropertyMirrorProto, {
      getter: {get: function() {return this.__createObjMirrorOn([this.__in.__domain,this.__desc.get])}},
      setter: {get: function() {return this.__createObjMirrorOn([this.__in.__domain,this.__desc.set])}},
      configurable: {get: function () {return this.__desc.configurable===true}},
      enumerable: {get: function () {return this.__desc.enumerable===true}},
      toString: {value: function() {return "JSON Accessor Property Introspection Mirror name: "+this.__key+ " #"+this.__id}}
    });
      
    var jsonDataPropertyMirrorProto  = Obj.create(dataPropertyMirrorProto, {
      writable: {get: function() {return this.__desc.writable===true}},
      value: {get: function() {return this.__createObjMirrorOn([this.__in.__domain,this.__desc.value])}},
      configurable: {get: function () {return this.__desc.configurable===true}},
      enumerable: {get: function () {return this.__desc.enumerable===true}},
      toString: {value: function() {return "JSON Data Property Introspection Mirror name: "+this.__key+ " #"+this.__id}}
    });
    
    var jsonIntrospectionMirrorProto = Obj.create(jsonObjMirrorProto,{
       __createObjMirrorOn: {value: createJSONMirrorOn},
       __createPropMirrorOn: {value: createJSONPropertyMirrorOn}
    });
 
     var jsonIntrospectionMirrorFunctionProto = Obj.create(jsonFunctionMirrorProto,{
       __createObjMirrorOn: {value: createJSONMirrorOn},
       __createPropMirrorOn: {value: createJSONPropertyMirrorOn}
    });

 
  function createJSONMirrorOn(domainRef /*domain refObj*/ ) {
      var domain,ref;
      var type = typeof domainRef;
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
               return Obj.create(jsonIntrospectionMirrorFunctionProto,{__domain: {value: domain}, __ser: {value: ref.objRef},__id: {value: serialNumber++}});
            else return Obj.create(jsonIntrospectionMirrorProto,{__domain: {value: domain}, __ser: {value: ref.objRef}, __id: {value: serialNumber++}});
         } else if (has(ref,'extern'))
            return createIntrospectionMirrorOn(eval(ref.extern));
        }
      throw "unknown serialization tag";
    };
    
   var jsonDataPropertyIntrospectionMirrorProto = Obj.create(jsonDataPropertyMirrorProto,{
       __createObjMirrorOn: {value: createJSONMirrorOn}
    });
    
    var jsonAccessorPropertyIntrospectionMirrorProto = Obj.create(jsonAccessorPropertyMirrorProto,{
       __createObjMirrorOn: {value: createJSONMirrorOn}
    });
  
   function createJSONPropertyMirrorOn(objMirror,desc) {
      var name = desc.data || desc.accessor;
      return Obj.create(has(desc,'data')?jsonDataPropertyIntrospectionMirrorProto
                                        :jsonAccessorPropertyIntrospectionMirrorProto,{
         __in: {value: objMirror},
         __key: {value: name},
         __desc:{value: desc},
         __id: {value: serialNumber++}
         });
    };
      
   var exports = {
      introspect: createIntrospectionMirrorOn,
      mutate: createMutationMirrorOn,
      introspectEval: createIntrospectionEvalMirrorOn,
      fullLocal: createMutableEvalMirrorOn,
      introspectJSON: createJSONMirrorOn
   };
   return exports;
}();

