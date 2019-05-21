let main = {
    _div_id: undefined,
    _width: undefined,
    _height: undefined,
    _svg_width: undefined,
    _svg_height: undefined,
    _layer_height: undefined,
    _grid: {width: undefined, height: undefined},
    _margin: {left: 15, right: 40, top: 50, bottom: 200},

    initialize: function (divID) {
        self = this;
        self._div_id = divID;
        self._width = $('#' + divID + '_view').width();
        self._height = $('#' + divID + '_view').height();
        // 除了top空余，其余为svg
        self._svg_width = self._width;
        self._svg_height = self._height - self._margin.top;

        d3.select('#' + self._div_id + '_view')
            .append('svg')
            .attr('transform', 'translate(0,0)')
            .attr('id', 'head')
            .attr('width', self._svg_width)
            .attr('height', self._margin.top - 8)
            .style('background', dataCenter.background_color);


        d3.select('#' + self._div_id + '_view')
            .append('svg')
            // .attr('transform', 'translate(0 ,' + self._margin.top + ')')
            .attr('id', self._div_id + '_svg')
            .attr('width', self._svg_width)
            .attr('height', self._svg_height)
            .style('background', dataCenter.background_color);

        d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);

        // 等待数据处理
        setTimeout(function () {
            dataCenter.set_slice_data();
            main.draw();
        }, 100);
    },

    draw: function () {
        self = this;
        let svg = d3.select('#' + self._div_id + '_svg');
        let space = 15; // 两个矩形间距
        // 剩余的宽度和高度
        let left_X = self._svg_width - self._margin.left - self._margin.right - space;
        let left_Y = self._svg_height - self._margin.bottom;
        self._layer_height = left_Y;
        // 画热图颜色legend
        self.drawLegend();
        self._grid.width = (left_X / 43).toFixed(2);
        // 保留小数点后两位, 重新计算space减少宽度误差
        space = self._svg_width - self._margin.left - self._margin.right - self._grid.width * 43;
        self._grid.height = left_Y / 16;
        let map = svg.append('g')
            .attr('id', 'map')
            .attr('transform', 'translate(0,0)');

        let layer1 = map.append('g')
            .attr('id', 'layer1')
            .attr('transform', 'translate(' + self._margin.left + ', 0)');

        let layer2 = map.append('g')
            .attr('id', 'layer2')
            .attr('transform', 'translate(' + (self._margin.left + self._grid.width * 30 + space) + ', 0)');

        layer1.append('rect')
            .attr('width', self._grid.width * 30)
            .attr('height', left_Y)
            .attr('stroke', dataCenter.blue_light)
            .attr('stroke-width', 1)
            .attr('fill', '#999999');

        layer2.append('rect')
            .attr('width', self._grid.width * 13)
            .attr('height', left_Y)
            .attr('stroke', dataCenter.blue_light)
            .attr('stroke-width', 1)
            .attr('fill', '#999999');

        let time = svg.append('g').attr('transform', 'translate(0, ' + left_Y + ')');

        let margin = {left: 40, right: 20, top: 20, bottom: 30};
        let margin2 = {left: 40, right: 20, top: 0, bottom: 20};
        let width = self._width - margin.left - margin.right;
        let height = self._margin.bottom * 0.7 - margin.top - margin.bottom;
        let height2 = self._margin.bottom * 0.3 - margin2.top - margin2.bottom;

        let x = d3.scaleTime().range([0, width]),
            x2 = d3.scaleTime().range([0, width]),
            y = d3.scaleLinear().range([height, 0]),
            y2 = d3.scaleLinear().range([height2, 0]);

        let xAxis = d3.axisBottom(x),
            xAxis2 = d3.axisBottom(x2),
            yAxis = d3.axisLeft(y).ticks(5);

        let brush = d3.brushX()
            .extent([[0, 0], [width, height2]])
            .on("brush end", brushed);

        let zoom = d3.zoom()
            .scaleExtent([1, Infinity])
            .translateExtent([[0, 0], [width, height]])
            .extent([[0, 0], [width, height]])
            .on("zoom", zoomed);

        let line = d3.line()
            .x(function (d) {
                return x(d['x']);
            })
            .y(function (d) {
                return y(d['y']);
            });

        let line2 = d3.line()
            .x(function (d) {
                return x2(d['x']);
            })
            .y(function (d) {
                return y2(d['y']);
            });

        let clip = time.append("defs").append("svg:clipPath")
            .attr("id", "clip")
            .append("svg:rect")
            .attr("width", width)
            .attr("height", height)
            .attr("x", 0)
            .attr("y", 0);

        let Line_chart = time.append("g")
            .attr("class", "focus_line")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .attr("clip-path", "url(#clip)");


        let focus = time.append("g")
            .attr("class", "focus")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        let context = time.append("g")
            .attr("class", "context")
            .attr("transform", "translate(" + margin2.left + "," + (self._margin.bottom * 0.7) + ")");

        // set domain 点击room需要更新全局变量
        x.domain(dataCenter.getDomain(dataCenter.day_time_range[dataCenter.select_day - 1]));
        y.domain([0, d3.max(dataCenter.slice_data[dataCenter.select_room])]);
        x2.domain(x.domain());
        y2.domain(y.domain());

        focus.append('g')
            .attr('class', 'axis axis--x')
            .attr('transform', 'translate(0,' + height + ')')
            .call(xAxis);

        focus.append('g')
            .attr('class', 'axis axis--y')
            .call(yAxis);

        //  class focus_line->line
        Line_chart.append('path')
            .attr('class', 'line')
            .attr('d', line(dataCenter.get_room_line_data(dataCenter.select_room)))
            .attr('fill', dataCenter.room_with_color[dataCenter.select_room]);

        //  class context->line
        context.append('path')
            .attr('class', 'line')
            .attr('d', line2(dataCenter.get_room_line_data(dataCenter.select_room)))
            .attr('fill', dataCenter.room_with_color[dataCenter.select_room]);

        context.append('g')
            .attr('class', 'axis axis--x')
            .attr('transform', 'translate(0,' + height2 + ')')
            .call(xAxis2);

        context.append('g')
            .attr('class', 'brush')
            .call(brush)
            .call(brush.move, x.range());

        time.append('rect')
            .attr('class', 'zoom')
            .attr('width', width)
            .attr('height', height)
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
            .call(zoom);

        function brushed() {
            if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'zoom')
                return;
            let s = d3.event.selection || x2.range();
            x.domain(s.map(x2.invert, x2));
            d3.select('.focus_line').select('.line').attr('d', line(dataCenter.get_room_line_data(dataCenter.select_room)));
            focus.select('.axis--x').call(xAxis);
            time.select('.zoom').call(zoom.transform, d3.zoomIdentity
                .scale(width / (s[1] - s[0]))
                .translate(-s[0], 0));
        }

        function zoomed() {
            if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'brush')
                return;
            let t = d3.event.transform;
            x.domain(t.rescaleX(x2).domain());
            d3.select('.focus_line').select('.line').attr('d', line(dataCenter.get_room_line_data(dataCenter.select_room)));
            focus.select('.axis--x').call(xAxis);
            context.select('.brush').call(brush.move, x.range().map(t.invertX, t));
        }

        ////////////////////////////// 为每个房间添加颜色, 并且设置顶部初始值
        addPos();

        function addPos() {
            main.addGridLine();
            dataCenter.room_id.forEach(element => {
                let group = undefined;
                if (Number(element['floor']) === 1)
                    group = d3.select('#layer1');
                else
                    group = d3.select('#layer2');

                group.append('rect')
                    .attr('class', 'pos')
                    .attr('id', 'room_' + element['room_id'])
                    .attr('x', element['y_min'] * self._grid.width)
                    .attr('y', element['x_min'] * self._grid.height)
                    .attr('width', (element['y_max'] - element['y_min'] + 1) * self._grid.width)
                    .attr('height', (element['x_max'] - element['x_min'] + 1) * self._grid.height)
                    .attr('stroke', dataCenter.blue_light)
                    .attr('stroke-width', 1)
                    .attr('fill', dataCenter.room_with_color[element['room_id']])
                    .on('click', function () {
                        //  先把之前选中边框还原
                        d3.select('#room_' + dataCenter.select_room).attr('stroke-width', 1);
                        //  更改全局信息
                        dataCenter.select_room = element['room_id'];
                        //  边框加粗
                        d3.select('#room_' + dataCenter.select_room).attr('stroke-width', 3);
                        y.domain([0, d3.max(dataCenter.slice_data[dataCenter.select_room])]);
                        y2.domain(y.domain());
                        focus.select('.axis--y')
                            .transition()
                            .duration(750)
                            .call(yAxis);

                        Line_chart.select('.line')
                            .transition()
                            .duration(750)
                            .attr('d', line(dataCenter.get_room_line_data(element['room_id'])))
                            .attr('fill', dataCenter.room_with_color[dataCenter.select_room]);

                        context.select('.line')
                            .transition()
                            .duration(750)
                            .attr('d', line2(dataCenter.get_room_line_data(element['room_id'])))
                            .attr('fill', dataCenter.room_with_color[dataCenter.select_room]);

                        main.clickRectangle(x.domain());
                    });

                group.append('text')
                    .attr('class', 'pos_text')
                    .attr('x', (element['y_max'] / 2 + element['y_min'] / 2 + 1 / 2) * self._grid.width)
                    .attr('y', (element['x_max'] / 2 + element['x_min'] / 2 + 1 / 2) * self._grid.height)
                    .style('font-size', dataCenter.get_text_size(element['room_id']))
                    .text(element['room_name']);
            });
            //  初始化操作
            //  默认的room_id高亮
            d3.select('#room_' + dataCenter.select_room).attr('stroke-width', 3);

            //  默认display所有时间段的热力图
            d3.select('#head')
                .append('text')
                .attr('id', 'display_text')
                .attr('x', self._svg_width - 100)
                .attr('y', self._margin.top / 2)
                .attr('text-anchor', 'middle')
                .attr('fill', 'steelblue')
                .text(dataCenter.getTimeRangeText(x.domain()));

            ////////////////////////////// 添加3天时间切换按钮 #day_1/2/3
            let rectW = 50, rectH = 30, gap = 0;
            for (let i = 0; i < 3; i++) {
                d3.select('#head')
                    .append('rect')
                    .attr('id', 'day' + (i + 1))
                    .attr('class', 'day_rect')
                    .attr('x', self._margin.left + i * (rectW + gap))
                    .attr('y', 0.5 * (self._margin.top - rectH))
                    .attr('rx', 3)
                    .attr('ry', 3)
                    .attr('width', rectW)
                    .attr('height', rectH)
                    .attr('fill', 'steelblue')
                    .attr('stroke', '#222222')
                    .style('cursor', 'pointer')
                    .on('click', function () {
                        d3.select('#day' + dataCenter.select_day).attr('fill', 'steelblue');
                        // 更新全局的 dataCenter.select_day, dataCenter.slice_data
                        dataCenter.select_day = i + 1;
                        //  高亮选中矩形
                        d3.select(this).attr('fill', dataCenter.select_color);
                        dataCenter.set_slice_data();
                        //  更改y轴和line
                        x.domain(dataCenter.getDomain(dataCenter.day_time_range[dataCenter.select_day - 1]));
                        x2.domain(x.domain());
                        y.domain([0, d3.max(dataCenter.slice_data[dataCenter.select_room])]);
                        y2.domain(y.domain());

                        focus.select('.axis--x')
                            .transition()
                            .duration(750)
                            .call(xAxis);

                        context.select('.axis--x')
                            .transition()
                            .duration(750)
                            .call(xAxis2);

                        focus.select('.axis--y')
                            .transition()
                            .duration(750)
                            .call(yAxis);

                        Line_chart.select('.line')
                            .transition()
                            .duration(750)
                            .attr('d', line(dataCenter.get_room_line_data(dataCenter.select_room)))
                            .attr('fill', dataCenter.room_with_color[dataCenter.select_room]);

                        context.select('.line')
                            .transition()
                            .duration(750)
                            .attr('d', line2(dataCenter.get_room_line_data(dataCenter.select_room)))
                            .attr('fill', dataCenter.room_with_color[dataCenter.select_room]);

                        main.clickRectangle(x.domain());
                    });

                d3.select('#head')
                    .append('text')
                    .attr('class', 'day_text')
                    .attr('x', self._margin.left + i * (rectW + gap) + 0.5 * rectW)
                    .attr('y', 0.5 * (self._margin.top - rectH) + 0.5 * rectH)
                    .attr('fill', 'smokewhite')
                    .text('day' + (i + 1))
            }
            // 默认的select_day高亮
            d3.select('#day' + dataCenter.select_day).attr('fill', dataCenter.select_color);

            ////////////////////////////// 添加slider-Simple
            let slider_width = 200;
            let sliderSimple = d3.sliderBottom()
                .min(0)
                .max(60)
                .width(slider_width)
                .height(self._margin.top - 8)
                // .ticks(12)
                .default(10)
                .on('onchange', val => {
                    if (val == 0) {
                        alert("Slice can't be 0! Please reselect!");
                        sliderSimple.value(dataCenter.select_slice / 60);
                    }
                    // else {
                    // d3.select('p#value-step').text(d3.format('.2%')(val));   内部调用
                    // d3.select('p#value-step').text(d3.format('.2%')(sliderSimple.value()));    外部调用
                    // dataCenter.select_slice = val * 60;
                    // }
                });

            let gSlider = d3.select('#head')
                .append('g')
                .attr('id', 'gStep')
                .attr('transform', 'translate(' + (self._margin.left + 3 * (rectW + gap) + 20) + ', 5)');

            gSlider.call(sliderSimple);
            ////////////////////////////// slider

            ////////////////////////////// 添加更新切片按钮 #update_btn
            let btn_w = 100;
            // let btn_h = (self._margin.top - 8) / 2;
            let btn_h = rectH;

            let update_btn = d3.select('#head')
                .append('g')
                .attr('transform', 'translate(' + (self._margin.left + 3 * (rectW + gap) + slider_width + 40) + ',0)');

            update_btn
                .append('rect')
                .attr('id', 'update_btn')
                .attr('class', 'day_rect')
                .style('cursor', 'pointer')
                .attr('y', (self._margin.top - 8 - btn_h) / 2)
                .attr('rx', 3)
                .attr('rx', 3)
                .attr('width', btn_w)
                .attr('height', btn_h)
                .attr('fill', dataCenter.blue_light)
                .on('click', function () {
                    dataCenter.select_slice = sliderSimple.value() * 60;
                    console.log(new Date());
                    dataCenter.set_slice_data();
                    console.log(new Date());
                    //  更改坐标轴和line
                    x.domain(dataCenter.getDomain(dataCenter.day_time_range[dataCenter.select_day - 1]));
                    x2.domain(x.domain());
                    y.domain([0, d3.max(dataCenter.slice_data[dataCenter.select_room])]);
                    y2.domain(y.domain());

                    focus.select('.axis--x')
                        .transition()
                        .duration(750)
                        .call(xAxis);

                    context.select('.axis--x')
                        .transition()
                        .duration(750)
                        .call(xAxis2);

                    focus.select('.axis--y')
                        .transition()
                        .duration(750)
                        .call(yAxis);

                    Line_chart.select('.line')
                        .transition()
                        .duration(750)
                        .attr('d', line(dataCenter.get_room_line_data(dataCenter.select_room)))
                        .attr('fill', dataCenter.room_with_color[dataCenter.select_room]);

                    context.select('.line')
                        .transition()
                        .duration(750)
                        .attr('d', line2(dataCenter.get_room_line_data(dataCenter.select_room)))
                        .attr('fill', dataCenter.room_with_color[dataCenter.select_room]);
                });

            update_btn
                .append('text')
                .attr('class', 'day_text')
                .attr('x', btn_w / 2)
                .attr('y', (self._margin.top - 8 - btn_h) / 2 + btn_h / 2)
                .text('update slice');
            ////////////////////////////// #update_btn
        }

        ////////////////////////////// function:add_pos
    },


    heatmap: function (left, right) {
        // left 和 right 为时间戳
        self = this;
        let room_id = dataCenter.room_id;
        // heat_data 保存两层所有房间的在left-right时间内检测到的人数
        let heat_data = dataCenter.get_person_sum(left, right);
        let max_sum = d3.max(heat_data);
        // let max_sum = 0;
        // for (let i in dataCenter.person_room[dataCenter.select_day - 1])
        //     max_sum++;

        for (let i = 0; i < room_id.length; i++) {
            let t = room_id[i];
            let color = dataCenter.room_with_color[t['room_id']];
            let fill = dataCenter.colorScale(heat_data[i] / max_sum);
            d3.select('#room_' + t['room_id'])
                .attr('stroke', color)
                .attr('fill', fill)
                .on('mouseover', function () {
                    let text = heat_data[i];
                    d3.select('.tooltip').transition()
                        .duration(100)
                        .style('opacity', 0.9);
                    d3.select('.tooltip').html(text)
                        .style('left', (d3.event.pageX) + 'px')
                        .style('top', (d3.event.pageY - 20) + 'px')
                })
                .on('mousemove', function () {
                    let text = heat_data[i];
                    d3.select('.tooltip').transition()
                        .duration(100)
                        .style('opacity', 0.9);
                    d3.select('.tooltip').html(text)
                        .style('left', (d3.event.pageX) + 'px')
                        .style('top', (d3.event.pageY - 20) + 'px')
                })
                .on('mouseout', function () {
                    d3.select('.tooltip')
                        .transition()
                        .duration(200)
                        .style('opacity', 0);
                });
        }
    },

    addGridLine: function () {
        self = this;
        let _grid = self._grid;
        let h = self._layer_height, w1 = _grid.width * 30, w2 = _grid.width * 13;

        for (let i = 1; i < 30; i++) {
            d3.select('#layer1')
                .append('path')
                .attr('class', 'grid_line')
                .attr('d', function () {
                    return 'M' + i * _grid.width + ',' + 0 + ' ' + i * _grid.width + ',' + h;
                })
        }

        for (let i = 1; i < 13; i++) {
            d3.select('#layer2')
                .append('path')
                .attr('class', 'grid_line')
                .attr('d', function () {
                    return 'M' + i * _grid.width + ',' + 0 + ' ' + i * _grid.width + ',' + h;
                })
        }
        for (let i = 1; i < 16; i++) {
            d3.select('#layer1')
                .append('path')
                .attr('class', 'grid_line')
                .attr('d', function () {
                    return 'M' + 0 + ',' + i * _grid.height + ' ' + w1 + ',' + i * _grid.height;
                });

            d3.select('#layer2')
                .append('path')
                .attr('class', 'grid_line')
                .attr('d', function () {
                    return 'M' + 0 + ',' + i * _grid.height + ' ' + w2 + ',' + i * _grid.height;
                })
        }
    },

    clickRectangle: function (domain) {
        //  更改display显示的时间
        d3.select('#display_text')
            .transition()
            .duration(750)
            .text(dataCenter.getTimeRangeText(domain));

        //  更改热力图
        let left = domain[0], right = domain[1];
        let t1 = dataCenter.time2stamp(left);
        let t2 = dataCenter.time2stamp(right);
        main.heatmap(t1, t2);
    },

    drawLegend: function () {
        self = this;
        //  添加legend
        let padding = 5;
        let left = 25;  //  留给文字的宽度
        let legendWidth = self._margin.right - left, legendHeight = self._layer_height - 2 * padding;
        let gLegend = d3.select('#main_svg')
            .append('g')
            .attr('transform', 'translate(' + (self._svg_width - self._margin.right) + ', 0)');

        let legend = gLegend
            .append('defs')
            .append('linearGradient')
            .attr('id', 'gradient')
            .attr('x1', '100%')
            .attr('y1', '100%')
            .attr('x2', '100%')
            .attr('y2', '0%')
            .attr('spreadMethod', 'pad');

        legend.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#fffccd")
            .attr("stop-opacity", 1);

        legend.append("stop")
            .attr("offset", "20%")
            .attr("stop-color", "#f5bb68")
            .attr("stop-opacity", 1);

        legend.append("stop")
            .attr("offset", "50%")
            .attr("stop-color", "#ea7042")
            .attr("stop-opacity", 1);

        legend.append("stop")
            .attr("offset", "75%")
            .attr("stop-color", "#c02c2b")
            .attr("stop-opacity", 1);

        legend.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#7e1628")
            .attr("stop-opacity", 1);

        gLegend
            .append('rect')
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .attr('fill', 'url(#gradient)')
            .attr('transform', 'translate(' + left + ',' + padding + ')');

        let legendScale = d3.scaleLinear()
            .domain([1, 0])
            .range([0, legendHeight]);

        let legendAxis = d3.axisLeft()
            .scale(legendScale)
            .ticks(4);

        gLegend
            .append('g')
            .attr('id', 'gLegend')
            .call(legendAxis)
            .attr('transform', 'translate(' + left + ',' + padding + ')');
    }
};