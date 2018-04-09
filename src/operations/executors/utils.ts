/**
 * @license
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
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
 * =============================================================================
 */

import * as tfc from '@tensorflow/tfjs-core';

import {NamedTensorsMap} from '../../data/index';
import {ExecutionContext} from '../../executor';
import {Node, ValueType} from '../index';

export function getParamValue(
    paramName: string, node: Node, tensorMap: NamedTensorsMap,
    context: ExecutionContext): ValueType {
  const param = node.params[paramName];
  if (param && param.inputIndex !== undefined) {
    if (param.type === 'tensor') {
      return getTensor(node.inputNames[param.inputIndex], tensorMap, context);
    }
    if (param.type === 'tensors') {
      const inputs = param.inputIndex === 0 ?
          node.inputNames.slice(param.inputIndex, -param.inputParamLength) :
          node.inputNames.splice(param.inputIndex);

      return inputs.map(name => getTensor(name, tensorMap, context));
    }
    const data = Array.prototype.slice.call(
        getTensor(
            node.inputNames.slice(param.inputIndex)[0], tensorMap, context)
            .dataSync());
    return param.type === 'number' ? data[0] : data;
  }
  return param && param.value;
}

/**
 * Retrieve the tensor based on input name by extracting the node name and
 * output index information.
 * @param name Node input name
 * @param tensorsMap Tensors map keyed by the node
 */
export function getTensor(
    name: string, tensorsMap: NamedTensorsMap,
    context: ExecutionContext): tfc.Tensor {
  const [nodeName, index] = getNodeNameAndIndex(name, context);
  if (tensorsMap[nodeName]) {
    return tensorsMap[nodeName][index];
  } else {
    const [nodeName, index] = getNodeNameAndIndex(name);
    const weight = context.getWeight(nodeName);
    return weight ?
        weight[index] :
        tensorsMap[nodeName] ? tensorsMap[nodeName][index] : undefined;
  }
}

/**
 * Returns the node name and index from the Node input name.
 * @param inputName The input name of the node, in format of
 * node_name:output_index, i.e. MatMul:0, if the output_index is not set, it is
 * default to 0.
 */
export function getNodeNameAndIndex(
    inputName: string, context?: ExecutionContext): [string, number] {
  const index = inputName.lastIndexOf(':');
  if (index === -1) return [getNodeNameWithContextId(inputName, context), 0];

  const nodeName =
      getNodeNameWithContextId(inputName.substring(0, index), context);
  return [nodeName, Number(inputName.substring(index + 1))];
}

function getNodeNameWithContextId(
    name: string, context?: ExecutionContext): string {
  return !!context && !!context.currentContextId ?
      `${name}-${context.currentContextId}` :
      name;
}
