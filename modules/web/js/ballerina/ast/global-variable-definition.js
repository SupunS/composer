/**
 * Copyright (c) 2017, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import _ from 'lodash';
import log from 'log';
import ASTNode from './node';
import BallerinaAstFactory from './ast-factory';
import ASTFactory from './ast-factory.js';
import { parseContent } from './../../api-client/api-client';

/**
 * Constructor GlobalVariableDefinition
 * @constructor
 */
class GlobalVariableDefinition extends ASTNode {
    constructor(args) {
        super({type: 'Global-Varialbe-Definition'});
        this.whiteSpace.defaultDescriptor.regions = {
            0: ' ',
            1: ' ',
            2: ' ',
            3: '',
            4: '\n',
        };
    }

    getGlobalVariableDefinitionAsString() {
        const variableDef = this.getChildren()[0];
        const expression = this.getChildren()[1];

        let defString = variableDef.getPkgName() ? variableDef.getPkgName() + ':': '';
        defString += variableDef.getTypeName();

        if(variableDef.isArray()){
            defString += '[]'
        }

        defString += this.getWSRegion(0) + variableDef.getName();

        if (expression) {
            defString += this.getWSRegion(1) + '=' + this.getWSRegion(2) + expression.getExpressionString();
        } else {
            defString += this.getWSRegion(3);
        }

        return defString;
    }

    // TODO: This Need to be refactored, in order to tally with the setStatementFromString
    setGlobalVariableDefinitionFromString(value) {
        const currentIndex = _.indexOf(this.getParent().getChildren(), this);
        this.getParent().removeChild(this, true);

        if (!value) {
            return;
        }

        value += ';\n';
        parseContent(value)
            .then((jsonTree) => {
                // 0 th object of jsonTree is a packageDeclaration. Next should be global var or const.
                if (!jsonTree.root[1]) {
                    return;
                }

                this.getParent().addGlobal(jsonTree.root[1], currentIndex);
            })
            .catch(log.error);
    }

    _createVarDef(jsonNode){
        const args = {
            name: jsonNode.global_variable_definition_identifier,
            typeName: jsonNode.global_variable_definition_btype,
            pkgName: jsonNode.package_name,
            isArray: jsonNode.is_array_type,
        }
        return ASTFactory.createVariableDefinition(args);
    }

    /**
     * Initialize GlobalVariableDefinition from json object for parsing.
     * @param {Object} jsonNode - Model of a constant definition for parsing.
     * @param {string} jsonNode.constant_definition_btype - The ballerina type of the constant.
     * @param {string} jsonNode.constant_definition_identifier - The identifier of the constant.
     * @param {string} jsonNode.constant_definition_value - The value of the constant.
     */
    initFromJson(jsonNode) {
        if (!_.isNil(jsonNode.whitespace_descriptor)) {
            this.whiteSpace.currentDescriptor = jsonNode.whitespace_descriptor;
            this.whiteSpace.useDefault = false;
        }

        this.addChild(this._createVarDef(jsonNode));

        for (const childNode of jsonNode.children) {
            const child = ASTFactory.createFromJson(childNode);
            this.addChild(child);
            child.initFromJson(childNode);
        }
    }

    /**
     * Get the content replace region on content suggestion at design view
     * @returns {{startC: {number}, stopC: {number}}} - object containing start char and the stop char
     */
    getContentReplaceRegion() {
        const segments = this.getFile().getContent().split(/\r?\n/);
        const position = this.getPosition();
        const joinedSegments = segments.slice(0, position.startLine - 1).join();
        const start = joinedSegments.length + 1 + position.startOffset;
        const stop = start + this.getGlobalVariableDefinitionAsString().length + 1;
        return {
            startC: start,
            stopC: stop,
        };
    }

    /**
     * Get the content start position for the statement
     * @returns {number} - start position
     */
    getContentStartCursorPosition() {
        return this.getPosition().startOffset;
    }
}

export default GlobalVariableDefinition;
