(function(){
"use strict";
if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (searchString, position) {
        position = position || 0;
        return this.indexOf(searchString, position) === position;
    };
}
if (!String.prototype.endsWith) {
    String.prototype.endsWith = function (searchString, position) {
        var subjectString = this.toString();
        if (position === undefined || position > subjectString.length) {
            position = subjectString.length;
        }
        position -= searchString.length;
        var lastIndex = subjectString.indexOf(searchString, position);
        return lastIndex !== -1 && lastIndex === position;
    };
}
if (!String.prototype.includes) {
    String.prototype.includes = function () {
        'use strict';
        return String.prototype.indexOf.apply(this, arguments) !== -1;
    };
}
if (!String.prototype.format) {
    String.prototype.format = function () {
        var formatted = this;
        for (var i = 0; i < arguments.length; i++) {
            var regexp = new RegExp('\\{' + i + '\\}', 'gi');
            formatted = formatted.replace(regexp, arguments[i]);
        }
        return formatted;
    };
}
if (!Array.prototype.includes) {
    Object.defineProperty(Array.prototype, 'includes', {
        value: function (searchElement, fromIndex) {

            // 1. Let O be ? ToObject(this value).
            if (this == null) {
                throw new TypeError('"this" is null or not defined');
            }

            var o = Object(this);

            // 2. Let len be ? ToLength(? Get(O, "length")).
            var len = o.length >>> 0;

            // 3. If len is 0, return false.
            if (len === 0) {
                return false;
            }

            // 4. Let n be ? ToInteger(fromIndex).
            //    (If fromIndex is undefined, this step produces the value 0.)
            var n = fromIndex | 0;

            // 5. If n ? 0, then
            //  a. Let k be n.
            // 6. Else n < 0,
            //  a. Let k be len + n.
            //  b. If k < 0, let k be 0.
            var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

            function sameValueZero(x, y) {
                return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));
            }

            // 7. Repeat, while k < len
            while (k < len) {
                // a. Let elementK be the result of ? Get(O, ! ToString(k)).
                // b. If SameValueZero(searchElement, elementK) is true, return true.
                // c. Increase k by 1. 
                if (sameValueZero(o[k], searchElement)) {
                    return true;
                }
                k++;
            }

            // 8. Return false
            return false;
        }
    });
}
   
/*
 * Copyright 2015 brutusin.org
 *
 * Licensed under the Apache License, Version 2.0 (the "SuperLicense");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * 
 * @author Ignacio del Valle Alles idelvall@brutusin.org
 */

/* global brutusin */

if (typeof brutusin === "undefined") {
    window.brutusin = new Object();
} else if (typeof brutusin !== "object") {
    throw "brutusin global variable already exists";
}
var BrutusinForms = new Object();

BrutusinForms.factories = {
    schemaResolver: null,
    typeComponents: {
        string: null,
        object: null,
      //  array: null,
        boolean: null,
        number: null,
        integer: null,
        any: null
    }
};
brutusin["json-forms"] = BrutusinForms;
/* global BrutusinForms */

BrutusinForms.createForm = function (schema, initialData, config) {
    return new BrutusinForm(schema, initialData, config);
};

function BrutusinForm(schema, initialData, config) {
    this.schema = schema;
    this.initialData = initialData;

    var schemaResolver = createSchemaResolver(config);
    schemaResolver.init(this);
    var typeFactories = createFactories(config);
    var dOMForm = createDOMForm();
    var formFunctions = {schemaResolver: schemaResolver, createTypeComponent: createTypeComponent, appendChild: appendChild};
    var rootComponent;

    createTypeComponent("$", initialData, function (component) {
        rootComponent = component;
        appendChild(dOMForm, component.getDOM());
    });

    this.getData = function () {
        return rootComponent.getData();
    };

    this.getDOM = function () {
        return dOMForm;
    };

    function appendChild(parent, child, schema) {
        parent.appendChild(child);
        // TODO
//            for (var i = 0; i < BrutusinForms.decorators.length; i++) {
//                BrutusinForms.decorators[i](child, schema);
//            }
    }

    function createDOMForm() {
        var ret = document.createElement("form");
        ret.className = "brutusin-form";
        ret.onsubmit = function (event) {
            return false;
        };
        return ret;
    }

    function createSchemaResolver(config) {
        if (!BrutusinForms.factories.schemaResolver) {
            throw "SchemaResolver factory not registered";
        }
        var ret = new BrutusinForms.factories.schemaResolver;
        if (config && config.customSchemaResolver) {
            ret.resolveSchemas = config.customSchemaResolver;
        }
        return ret;
    }

    function createFactories(config) {
        var ret = {};
        for (var prop in BrutusinForms.factories.typeComponents) {
            if (!BrutusinForms.factories.typeComponents[prop]) {
                throw "TypeComponent factory not registered for type '" + prop + "'";
            }
            ret[prop] = BrutusinForms.factories.typeComponents[prop];
        }
        return ret;
    }

    function createTypeComponent(schemaId, initialData, callback) {
        var listener = function (schema) {
            if (!schema || !schema.type || schema.type === "null") {
                return;
            }
            if (typeFactories.hasOwnProperty(schema.type)) {
                var component = new typeFactories[schema.type];
                component.init(schemaId, initialData, formFunctions);
                schemaResolver.removeListener(schemaId, listener);
                callback(component);
            } else {
                throw "Component factory not found for schemas of type '" + schema.type + "'";
            }
        };
        schemaResolver.addListener(schemaId, listener);
    }
}
/* global BrutusinForms */

/**
 * Async schema resolution. Schema listeners are notified once initially and later when a subschema item changes
 * @returns {SchemaResolver}
 */
var SCHEMA_ANY = {"type": "any"};

function SchemaResolver() {
    var listeners = {};
    var schemaMap;

    function normalizeId(id) {
        return id.replace(/\["[^"]*"\]/g, "[*]").replace(/\[\d*\]/g, "[#]");
    }

    function cleanNonExistingEntries(id, newEntries) {
        for (var prop in schemaMap) {
            if (prop.startsWith(id) && !newEntries.hasOwnProperty(prop)) {
                var listenerCallbacks = listeners[prop];
                if (listenerCallbacks) {
                    for (var i = 0; i < listenerCallbacks.length; i++) {
                        listenerCallbacks[i](null);
                    }
                }
                delete schemaMap[prop];
            }
        }
    }

    function processSchema(id, schema, dynamic) {
        var entryMap = {};
        var dependencyMap = {};
        renameRequiredPropeties(schema); // required v4 (array) -> requiredProperties
        populateSchemaMap(id, schema);
        validateDepencyGraphIsAcyclic();
        merge();
        return entryMap;

        function renameRequiredPropeties(schema) {
            if (!schema) {
                return;
            } else if (schema.hasOwnProperty("oneOf")) {
                for (var i in schema.oneOf) {
                    renameRequiredPropeties(schema.oneOf[i]);
                }
            } else if (schema.hasOwnProperty("$ref")) {
                var newSchema = getDefinition(schema["$ref"]);
                renameRequiredPropeties(newSchema);
            } else if (schema.type === "object") {
                if (schema.properties) {
                    if (schema.hasOwnProperty("required")) {
                        if (Array.isArray(schema.required)) {
                            schema.requiredProperties = schema.required;
                            delete schema.required;
                        }
                    }
                    for (var prop in schema.properties) {
                        renameRequiredPropeties(schema.properties[prop]);
                    }
                }
                if (schema.patternProperties) {
                    for (var pat in schema.patternProperties) {
                        var s = schema.patternProperties[pat];
                        if (s.hasOwnProperty("type") || s.hasOwnProperty("$ref") || s.hasOwnProperty("oneOf")) {
                            renameRequiredPropeties(schema.patternProperties[pat]);
                        }
                    }
                }
                if (schema.additionalProperties) {
                    if (schema.additionalProperties.hasOwnProperty("type") || schema.additionalProperties.hasOwnProperty("oneOf")) {
                        renameRequiredPropeties(schema.additionalProperties);

                    }
                }
            } else if (schema.type === "array") {
                renameRequiredPropeties(schema.items);
            }
        }
        function populateSchemaMap(id, schema) {
            var pseudoSchema = createPseudoSchema(schema);
            entryMap[id] = {id: id, schema: pseudoSchema, static: !dynamic};
            if (!schema) {
                return;
            } else if (schema.hasOwnProperty("oneOf")) {
                pseudoSchema.oneOf = new Array();
                pseudoSchema.type = "oneOf";
                for (var i in schema.oneOf) {
                    var childProp = id + "." + i;
                    pseudoSchema.oneOf[i] = childProp;
                    populateSchemaMap(childProp, schema.oneOf[i]);
                }
            } else if (schema.hasOwnProperty("$ref")) {
                var refSchema = getDefinition(schema["$ref"]);
                if (refSchema) {
                    if (schema.hasOwnProperty("title") || schema.hasOwnProperty("description")) {
                        var clonedRefSchema = {};
                        for (var prop in refSchema) {
                            clonedRefSchema[prop] = refSchema[prop];
                        }
                        if (schema.hasOwnProperty("title")) {
                            clonedRefSchema.title = schema.title;
                        }
                        if (schema.hasOwnProperty("description")) {
                            clonedRefSchema.description = schema.description;
                        }
                        refSchema = clonedRefSchema;
                    }
                    populateSchemaMap(id, refSchema);
                }
            } else if (schema.type === "object") {
                if (schema.properties) {
                    pseudoSchema.properties = {};
                    for (var prop in schema.properties) {
                        var childProp = id + "." + prop;
                        pseudoSchema.properties[prop] = childProp;
                        var subSchema = schema.properties[prop];
                        if (schema.requiredProperties) {
                            if (containsStr(schema.requiredProperties, prop)) {
                                subSchema.required = true;
                            } else {
                                subSchema.required = false;
                            }
                        }
                        populateSchemaMap(childProp, subSchema);
                    }
                }
                if (schema.patternProperties) {
                    pseudoSchema.patternProperties = {};
                    for (var pat in schema.patternProperties) {
                        var patChildProp = id + "[" + pat + "]";
                        pseudoSchema.patternProperties[pat] = patChildProp;
                        var s = schema.patternProperties[pat];

                        if (s.hasOwnProperty("type") || s.hasOwnProperty("$ref") ||
                                s.hasOwnProperty("oneOf")) {
                            populateSchemaMap(patChildProp, schema.patternProperties[pat]);
                        } else {
                            populateSchemaMap(patChildProp, SCHEMA_ANY);
                        }
                    }
                }
                if (schema.additionalProperties) {
                    var childProp = id + "[*]";
                    pseudoSchema.additionalProperties = childProp;
                    if (schema.additionalProperties.hasOwnProperty("type") ||
                            schema.additionalProperties.hasOwnProperty("oneOf")) {
                        populateSchemaMap(childProp, schema.additionalProperties);
                    } else {
                        populateSchemaMap(childProp, SCHEMA_ANY);
                    }
                }
            } else if (schema.type === "array") {
                pseudoSchema.items = id + "[#]";
                populateSchemaMap(pseudoSchema.items, schema.items);
            }
            if (schema.hasOwnProperty("dependsOn")) {
                if (schema.dependsOn === null) {
                    schema.dependsOn = ["$"];
                }
                var arr = new Array();
                for (var i = 0; i < schema.dependsOn.length; i++) {
                    if (!schema.dependsOn[i]) {
                        arr[i] = "$";
                        // Relative cases 
                    } else if (schema.dependsOn[i].startsWith("$")) {
                        arr[i] = schema.dependsOn[i];
                        // Relative cases 
                    } else if (id.endsWith("]")) {
                        arr[i] = id + "." + schema.dependsOn[i];
                    } else {
                        arr[i] = id.substring(0, id.lastIndexOf(".")) + "." + schema.dependsOn[i];
                    }
                }
                entryMap[id].dependsOn = arr;
                for (var i = 0; i < arr.length; i++) {
                    var entry = dependencyMap[arr[i]];
                    if (!entry) {
                        entry = new Array();
                        dependencyMap[arr[i]] = entry;
                    }
                    entry[entry.length] = id;
                }
            }
        }
        function validateDepencyGraphIsAcyclic() {
            function dfs(visitInfo, stack, id) {
                if (stack.hasOwnProperty(id)) {
                    throw "Schema dependency graph has cycles";
                }
                stack[id] = null;
                if (visitInfo.hasOwnProperty(id)) {
                    return;
                }
                visitInfo[id] = null;
                var arr = dependencyMap[id];
                if (arr) {
                    for (var i = 0; i < arr.length; i++) {
                        dfs(visitInfo, stack, arr[i]);
                    }
                }
                delete stack[id];
            }
            var visitInfo = new Object();
            for (var id in dependencyMap) {
                if (visitInfo.hasOwnProperty(id)) {
                    continue;
                }
                dfs(visitInfo, new Object(), id);
            }
        }
        function merge() {
            for (var id in dependencyMap) {
                if (entryMap.hasOwnProperty(id)) {
                    entryMap[id].dependedBy = dependencyMap[id];
                } else {
                    throw "Invalid schema id found in dependecies: " + id;
                }
            }
        }
        function createPseudoSchema(schema) {
            var pseudoSchema = {};
            for (var p in schema) {
                if (p === "items" || p === "properties" || p === "additionalProperties") {
                    continue;
                }
                if (p === "pattern") {
                    pseudoSchema[p] = new RegExp(schema[p]);
                } else {
                    pseudoSchema[p] = schema[p];
                }

            }
            return pseudoSchema;
        }
        function getDefinition(path) {
            var parts = path.split('/');
            var def = schema;
            for (var p in parts) {
                if (p === "0")
                    continue;
                def = def[parts[p]];
            }
            return def;
        }

    }

    this.init = function (form) {
        this.form = form;
        schemaMap = processSchema("$", form.schema, false);
    };

    this.notifyChanged = function (id) {
        var dependentIds = schemaMap[id].dependedBy;
        if (!dependentIds) {
            return;
        }
        this.resolve(dependentIds);
    };

    this.resolve = function (ids) {
        this.resolveSchemas(ids, this.form.getData(), function (schemas) {
            if (schemas) {
                for (var id in schemas) {
                    if (ids.includes(id)) {
                        if (!schemaMap.hasOwnProperty(id) || JSON.stringify(schemaMap[id].schema) !== JSON.stringify(schemas[id])) {
                            var newEntries = processSchema(id, schemas[id], true);
                            cleanNonExistingEntries(id, newEntries);
                            for (var prop in newEntries) {
                                schemaMap[prop] = newEntries[prop];
                                var listenerCallbacks = listeners[prop];
                                if (listenerCallbacks) {
                                    for (var i = 0; i < listenerCallbacks.length; i++) {
                                        listenerCallbacks[i](newEntries[prop].schema);
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                throw "Couldn't resolve schema item '" + id + "'";
            }
        });
    };

    this.addListener = function (id, callback) {
        id = normalizeId(id);
        if (listeners.hasOwnProperty(id)) {
            listeners[id].push(callback);
        } else {
            listeners[id] = [callback];
        }
        if (schemaMap.hasOwnProperty(id) && !schemaMap[id].dependsOn) {
            callback(schemaMap[id].schema);
            return;
        }
    };

    this.removeListener = function (id, callback) {
        id = normalizeId(id);
        if (listeners.hasOwnProperty(id)) {
            var callbacks = listeners[id];
            for (var i = 0; i < callbacks.length; i++) {
                if (callbacks[i] === callback) {
                    callbacks.splice(i, 1);
                    break;
                }
            }
        }
    };

    this.resolveSchemas = function (ids, data, callback) {
    };
}

BrutusinForms.factories.schemaResolver = SchemaResolver;
/* global BrutusinForms */

/**
 * Prototype for type input components
 * @returns {TypeComponent}
 */
function TypeComponent() {

    this.componentFunctions = {
        removeAllChildren: function removeAllChildren(domElement) {
            while (domElement.firstChild) {
                domElement.removeChild(domElement.firstChild);
            }
        }
    };

    this.init = function (schemaId, initialData, formFunctions) {
        this.schemaId = schemaId;
        this.initialData = initialData;
        this.formFunctions = formFunctions;
        this.dom = document.createElement("div");

        var component = this;

        function reset() {
            component.componentFunctions.removeAllChildren(component.dom);
            component.children = {};
        }

        this.schemaListener = function (schema) {
            component.schema = schema;
            reset();
            if (schema) {
                component.render(schema);
            }
        };

        this.formFunctions.schemaResolver.addListener(this.schemaId, this.schemaListener);
    };

    this.render = function (schema) {
    };
    this.getDOM = function () {
        return this.dom;
    };
    this.getData = function () {
    };
    this.validate = function () {
    };
    this.onchange = function () {
    };
    this.dispose = function () {
        this.formFunctions.schemaResolver.removeListener(this.schemaId, this.schemaListener);
    };
}
BrutusinForms.TypeComponent = TypeComponent;
/* global BrutusinForms */

function ObjectComponent() {
    this.render = function (schema) {
        var appendChild = this.formFunctions.appendChild;
        this.componentFunctions.removeAllChildren(this.dom);
        if (schema) {
            var table = document.createElement("table");
            table.className = "object";
            var tbody = document.createElement("tbody");
            appendChild(table, tbody);
            var component = this;
            if (schema.hasOwnProperty("properties")) {
                for (var p in schema.properties) {
                    var prop = p;
                    var propId = this.schemaId + "." + prop;
                    var tr = document.createElement("tr");
                    this.formFunctions.schemaResolver.addListener(propId, function (schema) {
                        component.componentFunctions.removeAllChildren(tr);
                        var child = component.children[prop];
                        if (child) {
                            child.dispose();
                            delete component.children[prop];
                        }
                        if (schema && schema.type && schema.type !== "null") {
                            var td1 = document.createElement("td");
                            td1.className = "prop-name";
                            var td2 = document.createElement("td");
                            td2.className = "prop-value";
                            appendChild(tbody, tr);
                            appendChild(tr, td1);
                            appendChild(td1, document.createTextNode(prop));
                            appendChild(tr, td2);
                            component.formFunctions.createTypeComponent(propId, null, function (child) {
                                component.children[prop] = child;
                                appendChild(td2, child.getDOM());
                            });
                        }
                    });
                }
            }
            appendChild(this.dom, table);
        }
    };

    this.getData = function () {
        var data = {};
        for (var prop in this.children) {
            data[prop] = this.children[prop].getData();
        }
        return data;
    };
}
ObjectComponent.prototype = new BrutusinForms.TypeComponent;
BrutusinForms.factories.typeComponents["object"] = ObjectComponent;
/* global BrutusinForms */
function SimpleComponent() {
    this.render = function (schema) {
        var component = this;
        var appendChild = this.formFunctions.appendChild;
        var initialData = this.initialData;
        this.input = createInput();
        this.input.onchange = function (evt) {
            component.formFunctions.schemaResolver.notifyChanged(component.schemaId);
            component.onchange(evt);
        };
        this.componentFunctions.removeAllChildren(this.dom);
        appendChild(this.dom, this.input);
        function createInput() {
            var input;
            if (schema.type === "any") {
                input = document.createElement("textarea");
                if (initialData) {
                    input.value = JSON.stringify(initialData, null, 4);
                    if (schema.readOnly)
                        input.disabled = true;
                }
            } else if (schema.media) {
                input = document.createElement("input");
                input.type = "file";
                appendChild(input, option);
                // XXX TODO, encode the SOB properly.
            } else if (schema.enum) {
                input = document.createElement("select");
                if (!schema.required) {
                    var option = document.createElement("option");
                    var textNode = document.createTextNode("");
                    option.value = "";
                    appendChild(option, textNode);
                    appendChild(input, option);
                }
                var selectedIndex = 0;
                for (var i = 0; i < schema.enum.length; i++) {
                    var option = document.createElement("option");
                    var textNode = document.createTextNode(schema.enum[i]);
                    option.value = schema.enum[i];
                    appendChild(option, textNode);
                    appendChild(input, option);
                    if (initialData && schema.enum[i] === initialData) {
                        selectedIndex = i;
                        if (!schema.required) {
                            selectedIndex++;
                        }
                        if (schema.readOnly)
                            input.disabled = true;
                    }
                }
                if (schema.enum.length === 1)
                    input.selectedIndex = 1;
                else
                    input.selectedIndex = selectedIndex;
            } else {
                input = document.createElement("input");
                if (schema.type === "integer" || schema.type === "number") {
                    input.type = "number";
                    input.step = "any";
                    if (typeof initialData !== "number") {
                        initialData = null;
                    }
                } else if (schema.format === "date-time") {
                    try {
                        input.type = "datetime-local";
                    } catch (err) {
                        // #46, problem in IE11. TODO polyfill?
                        input.type = "text";
                    }
                } else if (schema.format === "email") {
                    input.type = "email";
                } else if (schema.format === "text") {
                    input = document.createElement("textarea");
                } else {
                    input.type = "text";
                }
                if (initialData !== null && typeof initialData !== "undefined") {
                    // readOnly?
                    input.value = initialData;
                    if (schema.readOnly)
                        input.disabled = true;

                }
            }
            if (schema.description) {
                input.title = schema.description;
                input.placeholder = schema.description;
            }
            input.setAttribute("autocorrect", "off");
            return input;
        }
    };

    this.getData = function () {
        return getValue(this.schema, this.input);

        function getValue(schema, input) {
            if (!schema) {
                return null;
            }
            if (typeof input.getValue === "function") {
                return input.getValue();
            }
            var value;
            if (schema.enum) {
                value = input.options[input.selectedIndex].value;
            } else {
                value = input.value;
            }
            if (value === "") {
                return null;
            }
            if (schema.type === "integer") {
                value = parseInt(value);
                if (!isFinite(value)) {
                    value = null;
                }
            } else if (schema.type === "number") {
                value = parseFloat(value);
                if (!isFinite(value)) {
                    value = null;
                }
            } else if (schema.type === "boolean") {
                if (input.tagName.toLowerCase() === "input") {
                    value = input.checked;
                    if (!value) {
                        value = false;
                    }
                } else if (input.tagName.toLowerCase() === "select") {
                    if (input.value === "true") {
                        value = true;
                    } else if (input.value === "false") {
                        value = false;
                    } else {
                        value = null;
                    }
                }
            } else if (schema.type === "any") {
                if (value) {
                    eval("value=" + value);
                }
            }
            return value;
        }
    };
}

SimpleComponent.prototype = new BrutusinForms.TypeComponent;
BrutusinForms.factories.typeComponents["string"] = SimpleComponent;
BrutusinForms.factories.typeComponents["boolean"] = SimpleComponent;
BrutusinForms.factories.typeComponents["integer"] = SimpleComponent;
BrutusinForms.factories.typeComponents["number"] = SimpleComponent;
BrutusinForms.factories.typeComponents["any"] = SimpleComponent;
})();