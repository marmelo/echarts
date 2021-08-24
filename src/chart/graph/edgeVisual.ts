/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

import GlobalModel from '../../model/Global';
import GraphSeriesModel, { GraphEdgeItemOption } from './GraphSeries';
import { extend } from 'zrender/src/core/util';
import { intersectCurveCircle } from './adjustEdge'
import { getNodeGlobalScale, getSymbolSize } from './graphHelper';
import { cubicDerivativeAt } from 'zrender/src/core/curve';

function normalize(a: string | string[]): string[];
function normalize(a: number | number[]): number[];
function normalize(a: string | number | (string | number)[]): (string | number)[] {
    if (!(a instanceof Array)) {
        a = [a, a];
    }
    return a;
}

export default function graphEdgeVisual(ecModel: GlobalModel) {
    ecModel.eachSeriesByType('graph', function (seriesModel: GraphSeriesModel) {
        const graph = seriesModel.getGraph();
        const edgeData = seriesModel.getEdgeData();
        const symbolType = normalize(seriesModel.get('edgeSymbol'));
        const symbolSize = normalize(seriesModel.get('edgeSymbolSize'));

        // const colorQuery = ['lineStyle', 'color'] as const;
        // const opacityQuery = ['lineStyle', 'opacity'] as const;

        edgeData.setVisual('fromSymbol', symbolType && symbolType[0]);
        edgeData.setVisual('toSymbol', symbolType && symbolType[1]);
        edgeData.setVisual('fromSymbolSize', symbolSize && symbolSize[0]);
        edgeData.setVisual('toSymbolSize', symbolSize && symbolSize[1]);

        edgeData.setVisual('style', seriesModel.getModel('lineStyle').getLineStyle());

        edgeData.each(function (idx) {
            const itemModel = edgeData.getItemModel<GraphEdgeItemOption>(idx);
            const edge = graph.getEdgeByIndex(idx);
            const toSymbol = edge.getVisual('toSymbol');
            const symbolType = normalize(itemModel.getShallow('symbol', true));
            const symbolSize = normalize(itemModel.getShallow('symbolSize', true));
            // Edge visual must after node visual
            const style = itemModel.getModel('lineStyle').getLineStyle();

            const existsStyle = edgeData.ensureUniqueItemVisual(idx, 'style');
            extend(existsStyle, style);

            switch (existsStyle.stroke) {
                case 'source': {
                    const nodeStyle = edge.node1.getVisual('style');
                    existsStyle.stroke = nodeStyle && nodeStyle.fill;
                    break;
                }
                case 'target': {
                    const nodeStyle = edge.node2.getVisual('style');
                    existsStyle.stroke = nodeStyle && nodeStyle.fill;
                    break;
                }
            }

            symbolType[0] && edge.setVisual('fromSymbol', symbolType[0]);
            symbolType[1] && edge.setVisual('toSymbol', symbolType[1]);
            symbolSize[0] && edge.setVisual('fromSymbolSize', symbolSize[0]);
            symbolSize[1] && edge.setVisual('toSymbolSize', symbolSize[1]);

           
            if (edge.node1 === edge.node2 && toSymbol && toSymbol !== 'none') {
                const edgeData = edge.getLayout();
                const size = getSymbolSize(edge.node1);
                const radius = getNodeGlobalScale(seriesModel) * size / 2;
                
                let t = intersectCurveCircle(edgeData, edgeData[0], radius);
                if (t < 0.5) {
                    t = 1 - t;
                }
                const tdx = cubicDerivativeAt(edgeData[0][0], edgeData[1][0], edgeData[2][0], edgeData[3][0], t);
                const tdy = cubicDerivativeAt(edgeData[0][1], edgeData[1][1], edgeData[2][1], edgeData[3][1], t);
                const degree = Math.atan2(tdy, tdx) / Math.PI * 180;
                if( degree > 90 || degree < 0 && degree > -90) {
                    edge.setVisual('toSymbolRotate', degree + 188);
                } else {
                    edge.setVisual('toSymbolRotate', degree - 8);
                }
            }
        });
    });
}