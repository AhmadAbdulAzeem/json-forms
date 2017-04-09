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