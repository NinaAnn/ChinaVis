let dataCenter = {
    id: undefined,
    sid: undefined,
    sensor_max: [10886, 14774, 5337],
    sensor: undefined,
    room_id: undefined,
    room_with_sid: undefined,
    select_slice: 600, // 时间片初始为10分钟
    room_sum_time_slice: undefined, // 每个时间片下各个房间检测到的总数据量
    day_time_range: [[25240, 64858], [27050, 72019], [27070, 45164]],
    select_day: 1, // default select day 1
    select_room: '1_13',    // 更新后需要重设x和y的range,Line_chart和context的datum也需要更改
    select_id: undefined,
    // select_color: '#a2a9af',
    select_color: '#7876e1',
    // colorScale: d3.scaleSequential(d3['interpolateYlOrRd']),
    // colorScale: d3.scaleSequential(d3['interpolateBlues']),
    // colorScale: d3.scaleLinear().domain([0, 0.25, 0.5, 0.75, 1]).range(['#5bf3f0', '#8dff2b', '#ffeb30', '#ff8331', '#ed4222']),
    colorScale: d3.scaleLinear().domain([0, 0.25, 0.5, 0.75, 1]).range(['#fffccd', '#f5bb68', '#ea7042', '#c02c2b', '#7e1628']),
    background_color: '#d0d0d0',
    // background_color: '#0c161f',
    blue_light: '#589dd8',
    room_color: ['#005792', '#fd5f00', '#f6f6e9'],  // 不同room类型配置不同颜色
    room_with_color: undefined, // 每个房间配置颜色的hash映射
    person_room: [],    // 数组有三个成员，表示三天，每个为读取json转换为dict
    slice_data: {},  // 带时间片的数据,一行表示一个房间在所有时间的总人数
    display_time_range: [0, 0],   // 当前主视图热图数据的时间范围


    getDomain: function (list) {
        self = this;
        let n1 = list[0], n2 = list[1];
        let h1 = self.num2str(n1 / 3600), m1 = self.num2str((n1 % 3600) / 60), s1 = self.num2str(n1 % 60);
        let h2 = self.num2str(n2 / 3600), m2 = self.num2str((n2 % 3600) / 60), s2 = self.num2str(n2 % 60);
        let time1 = h1 + ':' + m1 + ':' + s1;
        let time2 = h2 + ':' + m2 + ':' + s2;
        let initial_date = '2001-01-01 ';
        return [new Date(initial_date + time1), new Date(initial_date + time2)];
    },

    num2str: function (num) {
        if (num < 10)
            return '0' + Math.floor(num);
        else
            return Math.floor(num);
    },

    getTimeRangeText: function (domain) {
        let left = domain[0], right = domain[1];
        let t1 = dataCenter.num2str(left.getHours()) + ':' + dataCenter.num2str(left.getMinutes())
            + ':' + dataCenter.num2str(left.getSeconds());
        let t2 = dataCenter.num2str(right.getHours()) + ':' + dataCenter.num2str(right.getMinutes())
            + ':' + dataCenter.num2str(right.getSeconds());
        return t1 + '~' + t2;
    },

    get_index_range: function (left, right, data) {
        // left 和 right 为时间戳(数字),data为sid的某一个传感器id的检测到的时间戳(字符串),返回[left, right]范围内的数据量
        // 先找left的index
        let key = left;
        let low = 0;
        let high = data.length - 1;
        while (low < high) {
            let mid = (low + high) / 2;
            if (+data[mid] < key)
                low = mid + 1;
            else
                high = mid - 1;
        }
        let idx_left = high;
        // 再找right的index
        key = right;
        low = 0;
        high = data.length - 1;
        while (low < high) {
            let mid = (low + high) / 2;
            if (+data[mid] < key)
                low = mid + 1;
            else
                high = mid - 1;
        }
        return high - idx_left + 1;
    },

    time2stamp: function (time) {
        return time.getHours() * 3600 + time.getMinutes() * 60 + time.getSeconds();
    },

    stamp2time: function (stamp) {
        let hh = self.num2str(stamp / 3600), mm = self.num2str((stamp % 3600) / 60), ss = self.num2str(stamp % 60);
        let time = hh + ':' + mm + ':' + ss;
        let initial_date = '2001-01-01 ';
        return new Date(initial_date + time);
    },

    get_person_sum: function (left, right) {
        // 计算给定时间戳范围内，每个房间出现人次的总和
        let result = {};
        // 初始化
        for (let i in dataCenter.room_id)
            result[dataCenter.room_id[i]['room_id']] = 0;
        // 计算每个人在其到过的所有房间是否包含left到right时间段
        let person_room = dataCenter.person_room[dataCenter.select_day - 1];
        for (let pid in person_room) {
            for (let rid in person_room[pid]) {
                let time_data = person_room[pid][rid];
                for (let i in time_data) {
                    // if (time_data[i][1] <= right || time_data[i][1] >= left) {
                    if (time_data[i][1] < left || time_data[i][0] > right) {
                        continue;
                    }
                    else {
                        // 跟新result
                        result[rid] += 1;
                        break;
                    }
                }
            }
        }
        let heat_data = [];
        for (let i = 0; i < dataCenter.room_id.length; i++) {
            let rid = dataCenter.room_id[i]['room_id'];
            heat_data.push(result[rid]);
        }
        return heat_data;
    },

    set_slice_data: function () {
        //  清除之前记录
        dataCenter.slice_data = {};
        // 更新时间片后，需要重新计算 dataCenter.slice_data
        self = this;
        let slice = dataCenter.select_slice;
        let range = dataCenter.day_time_range[dataCenter.select_day - 1];
        let slice_time = [];
        let slice_data = [];
        let cur = range[0], next = cur + slice;
        while (next < range[1]) {
            slice_time.push(cur);
            slice_data.push(self.get_person_sum(cur, next));
            cur = next;
            next += slice;
        }
        slice_time.push(cur);
        slice_data.push(self.get_person_sum(cur, range[1]));
        // 将时间戳变为时间
        for (let i = 0; i < slice_time.length; i++) {
            slice_time[i] = self.stamp2time(slice_time[i]);
        }
        // 此时的slice_data一行表示所有房间同一个时间段数量,需要转置
        let T = [];
        for (let i = 0; i < slice_data[0].length; i++) {
            T.push([]);
        }
        for (let i = 0; i < slice_data[0].length; i++) {    //32
            for (let j = 0; j < slice_data.length; j++) {    //67
                T[i].push(slice_data[j][i]);
            }
        }
        // 更新全局变量
        self.slice_time = slice_time;
        self.slice_data['time'] = slice_time;
        let room_id = dataCenter.room_id;
        for (let i = 0; i < room_id.length; i++) {
            self.slice_data[room_id[i]['room_id']] = T[i];
        }
    },

    get_room_line_data: function (room_id) {
        // 给定房间号, 返回range内该房间人数折线图数据
        self = this;
        let x = self.slice_data['time'];
        let y = self.slice_data[room_id];
        let data = [];
        for (let i = 0; i < y.length; i++) {
            data.push({'x': x[i], 'y': y[i]});
        }
        return data;
    },

    get_text_size: function (room_id) {
        //  获取主视图text文本的大小
        let index = dataCenter.room_color.indexOf(dataCenter.room_with_color[room_id]);
        let size = undefined;
        switch (index) {
            case 0:
                size = '0.7vw';
                break;
            case 1:
                size = '0.7vw';
                break;
            case 2:
                size = '0.4vw';
                break;
        }
        return size;
    }
};