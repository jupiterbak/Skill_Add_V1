/**
 * Copyright 2019 Siemens AG.
 * 
 * File: SkillVis.js
 * Project: SP 347
 * Author:
 *  - Jupiter Bakakeu
 **/

const opcua = require("node-opcua");
var hasOwnNestedProperty = function(obj, propertyPath) {
    if (!propertyPath)
        return false;

    var properties = propertyPath.split('.');

    for (var i = 0; i < properties.length; i++) {
        var prop = properties[i];

        if (!obj || !obj.hasOwnProperty(prop)) {
            return false;
        } else {
            obj = obj[prop];
        }
    }

    return true;
};


class Skill {
    constructor(logger, opcua_server) {
        this.logger = logger;
        this.addressSpace = opcua_server.engine.addressSpace;

        // get the namespace Index
        this.skill_namespace_index = null;

        this.request_value1_node= null;
        this.request_value2_node= null;
        this.results_errorID_node= null;
        this.results_valueOut_node= null;
        this.xRequestProvided_node = null;
        this.xResultAcknowledge_node = null;

        // Pooling Interval
        this.polling_interval = null;

        // detection flags
        this.last_request_provided_value = false;
        this.current_request_provided_value = false;

        this.call_result = 0;
    }

    initialize() {
        var self = this;
        // get the namespace Index
        this.skill_namespace_index = this.addressSpace.getNamespaceIndex("http://plantsim.vsma.org");
        this.skill_type_namespace_index = this.addressSpace.getNamespaceIndex("http://www.siemens.com/AutomationSkills");

        // Find the methods and nodes
        this.request_value1_node= this.addressSpace.findNode("ns=" + this.skill_namespace_index + ";s=\"Skill_Insert_DB\".\"Request\".\"value1\"");
        this.request_value2_node= this.addressSpace.findNode("ns=" + this.skill_namespace_index + ";s=\"Skill_Insert_DB\".\"Request\".\"value2\"");
        this.results_errorID_node= this.addressSpace.findNode("ns=" + this.skill_namespace_index + ";s=\"Skill_Insert_DB\".\"Result\".\"ErrorId\"");
        this.results_valueOut_node= this.addressSpace.findNode("ns=" + this.skill_namespace_index + ";s=\"Skill_Insert_DB\".\"Result\".\"valueOut\"");
        this.xRequestProvided_node = this.addressSpace.findNode("ns=" + this.skill_namespace_index + ";s=\"Skill_Insert_DB\".\"RequestProvided\"");
        this.xResultAcknowledge_node = this.addressSpace.findNode("ns=" + this.skill_namespace_index + ";s=\"Skill_Insert_DB\".\"ResultAcknowledge\"");

        // set  default values of parameters
        self.request_value1_node.setValueFromSource({ dataType: opcua.DataType.Double, value: 0 }, opcua.StatusCodes.Good, new Date());
        self.request_value2_node.setValueFromSource({ dataType: opcua.DataType.Double, value: 0 }, opcua.StatusCodes.Good, new Date());
        self.results_valueOut_node.setValueFromSource({ dataType: opcua.DataType.Double, value: 0 }, opcua.StatusCodes.Good, new Date());

        // Set the skill results flags
        self.xRequestProvided_node.setValueFromSource({ dataType: opcua.DataType.Boolean, value: false }, opcua.StatusCodes.Good, new Date());
        self.xResultAcknowledge_node.setValueFromSource({ dataType: opcua.DataType.Boolean, value: false }, opcua.StatusCodes.Good, new Date());
    }

    start() {
        var self = this;
        this.polling_interval = setInterval(() => {
            // save last value
            self.last_request_provided_value = self.current_request_provided_value;

            // read variable value
            self.current_request_provided_value = self.xRequestProvided_node.readValue().value.value;

            // Check if rising Edge
            if(self.last_request_provided_value === false && self.current_request_provided_value === true){
                // Execute computation
                var value1 = self.request_value1_node.readValue().value.value;
                var value2 = self.request_value2_node.readValue().value.value;
                // Compute and save results
                self.call_result = value1 + value2;

                // set the results after 1000 ms
                setTimeout(() => {
                    // Set the skill results 
                    self.results_errorID_node.setValueFromSource({ dataType: opcua.DataType.Int16, value: 0 }, opcua.StatusCodes.Good, new Date());  
                    self.results_valueOut_node.setValueFromSource({ dataType: opcua.DataType.Double, value: self.call_result }, opcua.StatusCodes.Good, new Date());

                    // reset xRequestProvided
                    self.xRequestProvided_node.setValueFromSource({ dataType: opcua.DataType.Boolean, value: false }, opcua.StatusCodes.Good, new Date());
                    self.xResultAcknowledge_node.setValueFromSource({ dataType: opcua.DataType.Boolean, value: true }, opcua.StatusCodes.Good, new Date());     
                }, 1000);

            }
        }, 1000);
    }

    stop() {
        clearInterval(this.polling_interval);
    }

    clear() {
        this.polling_interval = null;
    }
}

module.exports = Skill;