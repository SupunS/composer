/**
 * Copyright (c) 2016, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
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
import ConditionalStatement from './conditional-statement';
import FragmentUtils from '../../utils/fragment-utils';
import ASTFactory from '../ast-factory.js';

/**
 * Class for while statement in ballerina.
 */
class WhileStatement extends ConditionalStatement {
    /**
     * Constructor for while statement in ballerina.
     * @param {Object} args - Argument object for creating an if statement.
     * @param {string} [args.condition="true"] - The condition for "while".
     * @param {Statement} [args.statements="[]] - Statements of the "while".
     * @constructor
     */
    constructor(args) {
        super();
        this.type = 'WhileStatement';
        if (!_.isNil(_.get(args, 'condition'))) {
            this.setCondition(_.get(args, 'condition'));
        } else {
            const opts = {
                basicLiteralType: 'boolean',
                basicLiteralValue: true,
            };
            // create default condition
            this.setCondition(ASTFactory.createBasicLiteralExpression(opts));
        }
        this._statements = _.get(args, 'statements', []);
        this.whiteSpace.defaultDescriptor.regions = {
            0: '',
            1: ' ',
            2: '',
            3: ' ',
            4: '\n',
            5: '\n'
        };
    }

    /**
     * Get the condition as a string
     * @return {string} condition as string
     */
    getConditionString() {
        return this.getCondition().getExpressionString();
    }

    /**
     * Set the condition from string
     * @param {string} conditionString - condition string from which condition being set
     * @returns {void}
     */
    setConditionFromString(conditionString) {
        if (!_.isNil(conditionString) || !_.isEmpty(conditionString)) {
            const fragment = FragmentUtils.createExpressionFragment(conditionString);
            const parsedJson = FragmentUtils.parseFragment(fragment);
            const condition = ASTFactory.createFromJson(parsedJson);
            condition.initFromJson(parsedJson);
            this.setCondition(condition);
            condition.setParent(this, {doSilently: true});
        }
    }

    /**
     * Set the condition
     * @param {Expression} condition - condition string
     * @param {object} options - set attribute options
     * @returns {void}
     */
    setCondition(condition, options) {
        if (!_.isNil(condition)) {
            this.setAttribute('_condition', condition, options);
        }
    }

    /**
     * Get the while statement condition
     * @returns {expression} condition expression
     */
    getCondition() {
        return this._condition;
    }

    /**
     * initialize from json
     * @param {object} jsonNode - json node from which the while statement being initialized
     * @returns {void}
     */
    initFromJson(jsonNode) {
        const self = this;
        if (!_.isNil(jsonNode.condition)) {
            const condition = ASTFactory.createFromJson(jsonNode.condition);
            condition.initFromJson(jsonNode.condition);
            self.setCondition(condition, { doSilently: true });
            condition.setParent(this, {doSilently: true});
        }
        _.each(jsonNode.children, (childNode) => {
            let child;
            let childNodeTemp;
            // TODO : generalize this logic
            if (childNode.type === 'variable_definition_statement' && !_.isNil(childNode.children[1])
                && childNode.children[1].type === 'connector_init_expr') {
                child = ASTFactory.createConnectorDeclaration();
                childNodeTemp = childNode;
            } else {
                child = ASTFactory.createFromJson(childNode);
                childNodeTemp = childNode;
            }
            self.addChild(child, undefined, true, true);
            child.initFromJson(childNodeTemp);
        });
    }

    /**
     * Get the content replace region on content suggestion at design view
     * @returns {{startC: {number}, stopC: {number}}} - object containing start char and the stop char
     */
    getContentReplaceRegion() {
        const segments = this.getFile().getContent().split(/\r?\n/);
        const position = this.getPosition();
        const joinedSegments = segments.slice(0, position.startLine - 1).join();
        const statementStartSegment = 'while' + this.getWSRegion(1) + '(' + this.getWSRegion(2);
        const start = joinedSegments.length + 1 + position.startOffset + statementStartSegment.length;
        const conditionSegment = ((!_.isNil(this.getCondition())) ? this.getConditionString() : '');
        const stop = start + conditionSegment.length;
        return {
            startC: start,
            stopC: stop,
        };
    }

    /**
     * Get the content start position for the content suggestion
     * @returns {number} content start position
     */
    getContentStartCursorPosition() {
        const statementStartSegment = 'while' + this.getWSRegion(1) + '(' + this.getWSRegion(2);
        return this.getPosition().startOffset + statementStartSegment.length;
    }

    /**
     * Validates possible immediate child types.
     * @override
     * @param node
     * @return {boolean}
     */
    canBeParentOf(node) {
        return ASTFactory.isConnectorDeclaration(node)
            || ASTFactory.isVariableDeclaration(node)
            || ASTFactory.isWorkerDeclaration(node)
            || ASTFactory.isStatement(node);
    }
}

export default WhileStatement;
