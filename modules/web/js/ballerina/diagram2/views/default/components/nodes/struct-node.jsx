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

import React from 'react';
import _ from 'lodash';
import Alerts from 'alerts';
import log from 'log';
import PropTypes from 'prop-types';
import PanelDecorator from './../decorators/panel-decorator';
import './struct-definition.css';
import Renderer from './renderer';
import * as DesignerDefaults from './../../designer-defaults';
import SuggestionsText from './suggestions-text2';
import ImageUtil from '../../../../image-util';
import EditableText from './editable-text';
import StructDefinitionItem from './struct-definition-item';
import TreeUtils from './../../../../../model/tree-util';
import Node from './../../../../../../ballerina/model/tree/node';
import { parseContent } from './../../../../../../api-client/api-client';
import TreeBuilder from './../../../../../model/tree-builder';

/**
 * @class StructDefinition
 * @extends {React.Component}
 */
class StructNode extends React.Component {
    /**
     * Creates an instance of StructDefinition.
     * @param {any} props
     */
    constructor(props) {
        super(props);
        this.state = {
            newType: '',
            newIdentifier: '',
            newValue: '',
            newIdentifierEditing: false,
            newValueEditing: false,
        };
    }
    /**
     * Handle struct type change in input
     * @param {string} value - Struct type
     */
    onAddStructTypeChange(value) {
        this.validateStructType(value);
        this.setState({
            newType: value,
        });
    }
    /**
     * Add new struct variable definition
     * @param {string} bType - Data type of the new struct
     * @param {string} identifier - Name of the identifier
     * @param {any} defaultValue - Default value of the new identifier
     */
    addVariableDefinitionStatement(bType, identifier, defaultValue) {
        const structSuggestions = this.context.environment.getTypes().map(name => ({ name }));
        if (!bType) {
            const errorString = 'Struct Type Cannot be empty';
            Alerts.error(errorString);
            throw errorString;
        }
        const bTypeExists = _.findIndex(structSuggestions, (type) => {
            return type.name === bType;
        }) !== -1;
        if (!bTypeExists) {
            const errorString = `Invalid bType ${bType} provided`;
            Alerts.error(errorString);
            throw errorString;
        }
        if (!identifier || !identifier.length) {
            const errorString = 'Identifier cannot be empty';
            Alerts.error(errorString);
            throw errorString;
        }

        const { model } = this.props;
        const identifierAlreadyExists = _.findIndex(model.getFields(), (field) => {
            return field.getName().value === identifier;
        }) !== -1;
        if (identifierAlreadyExists) {
            const errorString = `A variable with identifier ${identifier} already exists.`;
            Alerts.error(errorString);
            throw errorString;
        }
        let statement = bType + ' ' + identifier;
        if (defaultValue) {
            statement += ' = ' + defaultValue;
        }
        statement += ';';
        parseContent(statement)
            .then((jsonTree) => {
                if (jsonTree.model.topLevelNodes[0]) {
                    this.props.model.addFields(TreeBuilder.build(jsonTree.model.topLevelNodes[0]));
                }
            })
            .catch(log.error);
    }
    /**
     * Handle the default value if the data type is a string
     * @param {string} dataType - Data type of the new struct
     * @param {string} value - Value of the new identifier
     */
    addQuotesToString(dataType, value) {
        if (dataType === 'string' && !/".*?"$/.test(value)) {
            if (value === '') {
                return value;
            }
            return `"${value}"`;
        }
        return value;
    }
    /**
     * Create new variable definition and reset input form
     */
    createNew() {
        const { newType, newValue, newIdentifier } = this.state;
        this.addVariableDefinitionStatement(newType, newIdentifier, this.addQuotesToString(newType, newValue));
        this.setState({
            newType: '',
            newIdentifier: '',
            newValue: '',
        });
    }
    /**
     * Delete struct variable definition
     * @param {Object} node
     */
    deleteStatement(node) {
        node.remove();
    }
    /**
     * Handle click event on new struct variable's type field
     */
    handleAddTypeClick() {
        this.setState({
            canShowAddType: true,
        });
    }

    /**
     * Validate input values for struct default values
     * Only checks for the simple literals
     *
     * @param {string} type
     * @param {any} value
     * @memberof StructDefinition
     */
    validateDefaultValue(type, value) {
        if (!value) {
            return;
        }
        if (type === 'int' && /^[-]?\d+$/.test(value)) {
            return;
        } else if (type === 'float' && ((/\d*\.?\d+/.test(value) || parseFloat(value)))) {
            return;
        } else if (type === 'boolean' && (/\btrue\b/.test(value) || /\bfalse\b/.test(value))) {
            return;
        } else if (type === 'string') {
            return;
        }
        const errorString = 'Type of the default value is not compatible with the expected struct type';
        Alerts.error(errorString);
        throw errorString;
    }
    /**
     * Hide new struct definition type dropdown
     */
    hideAddSuggestions() {
        this.setState({ canShowAddType: false });
    }

    /**
     * Validate identifier name
     * @param {string} identifier - identifier name
     */
    validateIdentifierName(identifier) {
        if (Node.isValidIdentifier(identifier)) {
            return true;
        }
        const errorString = `Invalid identifier for a variable: ${identifier}`;
        Alerts.error(errorString);
        return false;
    }
    /**
     * Validate struct type
     * @param {string} structType - struct type
     */
    validateStructType(structType) {
        if (!structType || !structType.length) {
            const errorString = 'Struct Type cannot be empty';
            Alerts.error(errorString);
            throw errorString;
        }

        if (!Node.isValidType(structType)) {
            const errorString = `Invalid Struct Type : ${structType}`;
            Alerts.error(errorString);
            throw errorString;
        }
    }
    /**
     *  Render content operations
     *
     * @param {Object} { x, y, w, h } - Dimensions to render
     * @param {Number} columnSize - Width of the column
     * @returns {Object} - React node
     */
    renderContentOperations({ x, y, w, h }, columnSize) {
        const placeHolderPadding = 10;
        const submitButtonPadding = 5;
        const typeCellbox = {
            x: x + DesignerDefaults.structDefinition.panelPadding,
            y: y + DesignerDefaults.structDefinition.panelPadding,
            width: columnSize - DesignerDefaults.structDefinition.panelPadding - DesignerDefaults.structDefinition.columnPadding / 2,
            height: h - DesignerDefaults.structDefinition.panelPadding * 2,
        };

        const identifierCellBox = {
            x: x + columnSize + DesignerDefaults.structDefinition.columnPadding / 2,
            y: y + DesignerDefaults.structDefinition.panelPadding,
            width: columnSize - DesignerDefaults.structDefinition.columnPadding,
            height: h - DesignerDefaults.structDefinition.panelPadding * 2,
        };

        const defaultValueBox = {
            x: x + columnSize * 2 + DesignerDefaults.structDefinition.columnPadding / 2,
            y: y + DesignerDefaults.structDefinition.panelPadding,
            width: columnSize - DesignerDefaults.structDefinition.columnPadding / 2,
            height: h - DesignerDefaults.structDefinition.panelPadding * 2,
        };
        const { environment } = this.context;
        const structSuggestions = environment.getTypes().map(name => ({ name }));
        return (
            <g>
                <rect x={x} y={y} width={w} height={h} className="struct-content-operations-wrapper" fill="#3d3d3d" />
                <g onClick={e => this.handleAddTypeClick(this.state.newType, typeCellbox)} >
                    <rect {...typeCellbox} className="struct-type-dropdown-wrapper" />
                    <text
                        x={typeCellbox.x + placeHolderPadding}
                        y={y + DesignerDefaults.contentOperations.height / 2 + 2}
                    > {this.state.newType || 'Select Type'}
                    </text>
                    <SuggestionsText
                        {...typeCellbox}
                        suggestionsPool={structSuggestions}
                        show={this.state.canShowAddType}
                        onBlur={() => this.hideAddSuggestions()}
                        onEnter={() => this.hideAddSuggestions()}
                        onChange={value => this.onAddStructTypeChange(value)}
                        value={this.state.newType}
                    />
                </g>
                <g onClick={e => this.setState({ newIdentifierEditing: true })} >
                    <rect {...identifierCellBox} className="struct-input-value-wrapper" />
                    <text
                        x={identifierCellBox.x + placeHolderPadding}
                        y={y + DesignerDefaults.contentOperations.height / 2 + 2}
                        className="struct-input-text"
                    >
                        {this.state.newIdentifierEditing ? '' : (this.state.newIdentifier ? this.state.newIdentifier : 'Identifier')}
                    </text>
                </g>
                <EditableText
                    {...identifierCellBox}
                    y={y + DesignerDefaults.contentOperations.height / 2}
                    placeholder="Identifier"
                    onBlur={() => {
                        this.setState({
                            newIdentifierEditing: false,
                        });
                    }}
                    editing={this.state.newIdentifierEditing}
                    onChange={(e) => {
                        if (!e.target.value.length || this.validateIdentifierName(e.target.value)) {
                            this.setState({
                                newIdentifier: e.target.value,
                            });
                        }
                    }}
                >
                    {this.state.newIdentifierEditing ? this.state.newIdentifier : ''}
                </EditableText>
                <g onClick={e => this.setState({ newValueEditing: true })}>
                    <rect {...defaultValueBox} className="struct-input-value-wrapper" />
                    <text
                        x={defaultValueBox.x + placeHolderPadding}
                        y={y + DesignerDefaults.contentOperations.height / 2 + 2}
                        className="struct-input-text"
                    >
                        {this.state.newValueEditing ? '' : (this.state.newValue ? this.state.newValue : '+ Add Default Value')}
                    </text>
                </g>
                <EditableText
                    {...defaultValueBox}
                    y={y + DesignerDefaults.contentOperations.height / 2}
                    placeholder="+ Add Default Value"
                    onBlur={() => {
                        this.setState({
                            newValueEditing: false,
                        });
                    }}
                    editing={this.state.newValueEditing}
                    onChange={(e) => {
                        this.setState({
                            newValue: e.target.value,
                        });
                    }}
                >
                    {this.state.newValueEditing ? this.state.newValue : ''}
                </EditableText>
                <rect
                    x={x + DesignerDefaults.structDefinitionStatement.width - 30}
                    y={y + 10}
                    width={25}
                    height={25}
                    className="struct-added-value-wrapper"
                />
                <image
                    x={x + DesignerDefaults.structDefinitionStatement.width - 30 + submitButtonPadding}
                    style={{ cursor: 'pointer' }}
                    y={y + 10 + submitButtonPadding}
                    width={20 - submitButtonPadding}
                    height={20 - submitButtonPadding}
                    onClick={() => this.createNew()}
                    className="struct-add-icon-wrapper"
                    xlinkHref={ImageUtil.getSVGIconString('check')}
                />
            </g>
        );
    }
    /**
     * Render a text box in a given bounding box
     *
     * @param {any} textValue - Initial Value
     * @param {Object} bBox - Bounding box
     * @param {function} callback - Callback function
     */
    renderTextBox(textValue, bBox, callback) {
        Renderer.renderTextBox({
            bBox,
            display: true,
            initialValue: textValue || '',
            onChange(value) {
                callback(value);
            },
        }, this.context.getOverlayContainer());
    }
    /**
     * @inheritdoc
     */
    render() {
        const { model } = this.props;
        const { bBox, components: { body } } = model.viewState;
        const children = model.getFields() || [];
        const title = model.getName().value;

        const coDimensions = {
            x: bBox.x + DesignerDefaults.panel.body.padding.left,
            y: bBox.y + (DesignerDefaults.panel.body.padding.top * 2) + model.viewState.components.annotation.h,
            w: DesignerDefaults.contentOperations.width,
            h: DesignerDefaults.contentOperations.height,
        };
        const columnSize = (coDimensions.w - DesignerDefaults.structDefinition.submitButtonWidth) / 3;
        return (
            <PanelDecorator icon="tool-icons/struct" title={title} bBox={bBox} model={model}>
                {this.renderContentOperations(coDimensions, columnSize)}
                <g>
                    {
                        children.map((child, i) => {
                            if (TreeUtils.isVariable(child)) {
                                return (
                                    <StructDefinitionItem
                                        x={coDimensions.x}
                                        y={coDimensions.y + DesignerDefaults.contentOperations.height +
                                        DesignerDefaults.structDefinitionStatement.height * i + 10}
                                        w={coDimensions.w}
                                        h={DesignerDefaults.structDefinitionStatement.height}
                                        model={child}
                                        key={child.getName().value}
                                        validateIdentifierName={this.validateIdentifierName}
                                        validateDefaultValue={this.validateDefaultValue}
                                        addQuotesToString={this.addQuotesToString}
                                    />
                                );
                            }
                        })
                    }
                </g>
            </PanelDecorator>
        );
    }
}

StructNode.contextTypes = {
    environment: PropTypes.instanceOf(Object).isRequired,
    getOverlayContainer: PropTypes.instanceOf(Object).isRequired,
};

export default StructNode;
