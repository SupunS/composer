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
import Statement from './statement';
import ASTFactory from '../ast-factory.js';

/**
 * Class for Aborted Statement
 */
class AbortedStatement extends Statement {
    /**
     * Constructor for Aborted statement
     */
    constructor() {
        super();
        this.type = 'AbortedStatement';
        this.whiteSpace.defaultDescriptor.regions = {
            0: '',
            1: ' ',
            2: '\n',
            3: ' ',
        };
    }

    /**
     * Initialize the node from the node json.
     * @param {object} jsonNode - Json model for the node.
     * @returns {void}
     */
    initFromJson(jsonNode) {
        const self = this;
        let child;
        _.each(jsonNode.children, (childNode) => {
            if (childNode.type === 'variable_definition_statement' &&
                !_.isNil(childNode.children[1]) && childNode.children[1].type === 'connector_init_expr') {
                child = ASTFactory.createConnectorDeclaration();
            } else {
                child = ASTFactory.createFromJson(childNode);
            }
            self.addChild(child, undefined, true, true);
            child.initFromJson(childNode);
        });
    }
}

export default AbortedStatement;
