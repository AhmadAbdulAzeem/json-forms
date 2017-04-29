/* global schemas */
if (!schemas.version) {
    schemas.version = {};
}
if (!schemas.version["draft-06"]) {
    schemas.version["draft-06"] = {};
}
schemas.version["draft-06"].createPseudoSchema = function (schemaId, schema) {
    var pseudoSchema = {};
    for (var p in schema) {
        if (p === "items") {
            if (Array.isArray(schema.items)) {
                pseudoSchema.items = [];
                for (var i = 0; i < schema.items.length; i++) {
                    pseudoSchema.items[i] = schemaId + "[" + i + "]";
                }
            } else {
                pseudoSchema.items = schemaId + "[#]";
            }
        } else if (p === "properties") {
            pseudoSchema.properties = {};
            for (var prop in schema.properties) {
                pseudoSchema.properties[prop] = schemaId + "." + prop;
            }
        } else if (p === "patternProperties") {
            pseudoSchema.patternProperties = {};
            for (var pat in schema.patternProperties) {
                pseudoSchema.patternProperties[pat] = schemaId + "[/" + pat + "/]";
            }
        } else if (p === "additionalProperties" && typeof schema.additionalProperties === "object") {
            pseudoSchema.additionalProperties = schemaId + "[*]";
        } else {
            pseudoSchema[p] = schema[p];
        }
    }
    if (!pseudoSchema.$schema) {
        pseudoSchema.$schema = "http://json-schema.org/draft-06/schema#";
    }
    return pseudoSchema;
};