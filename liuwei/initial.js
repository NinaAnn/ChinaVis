$(document).ready(function () {
    let width = window.innerWidth;
    let height = window.innerHeight;
    $('#overview').height(height - 4);
    // $('#overview').height(height - $('#title_div').height() - 4);
    viewInitialize();
});

function viewInitialize() {
    // 为每个房间配置颜色
    // room_id分别包含房间id, 扶梯id, 出入口id
    let room_id = [['1_1', '1_2', '1_3', '1_4', '1_5', '1_6', '1_7', '1_8', '1_9',
        '1_12', '1_13', '1_14', '1_15', '1_16', '1_17', '2_1', '2_2', '2_3', '2_4', '2_5'],
        ['1_10', '1_11', '2_6', '2_7'],
        ['1_18', '1_19', '1_20', '1_21', '1_22', '1_23', '1_24', '1_25']];
    let dict = {};
    for (let i in room_id) {
        for (let j in room_id[i]) {
            dict[room_id[i][j]] = dataCenter.room_color[i];
        }
    }
    dataCenter.room_with_color = dict;
    // $.ajaxSettings.async = false;
    // $.getJSON()
    d3.csv('data/room_id.csv', function (data) {
        dataCenter.room_id = data;
        let dict = {};
        for (let i = 0; i < data.length; i++) {
            dict[data[i].room_id] = [];
        }
        dataCenter.room_with_sid = dict;
        // 将每个房间的sensor_id分配到相应房间
        d3.csv('data/sensor_with_room.csv', function (data) {
            let dict = {};
            for (let i = 0; i < data.length; i++) {
                dict[data[i].sid] = {
                    "floor": +data[i].floor,
                    "x": +data[i].x,
                    "y": +data[i].y,
                    "room_id": data[i].room_id
                };
                if (data[i].room_id != '') {
                    dataCenter.room_with_sid[data[i].room_id].push(data[i].sid);
                }
            }
            dataCenter.sensor = dict;
            // 按顺序读取json文件
            // 添加 person->room 的三天文件
            queue()
                .defer(d3.json, 'data/person_room/1.json')
                .defer(d3.json, 'data/person_room/2.json')
                .defer(d3.json, 'data/person_room/3.json')
                .await(read_person_room);

            function read_person_room(error, d1, d2, d3) {
                dataCenter.person_room.push(d1);
                dataCenter.person_room.push(d2);
                dataCenter.person_room.push(d3);
            }
            // d3.json('data/person_room/1.json', function (d1) {
            //     dataCenter.person_room.push(d1);
            //     d3.json('data/person_room/2.json', function (d2) {
            //         dataCenter.person_room.push(d2);
            //         d3.json('data/person_room/3.json', function (d3) {
            //             dataCenter.person_room.push(d3);
            //         })
            //     })
            // });
            d3.json('data/sid_extracted.json', function (data) {
                dataCenter.sid = data;
                main.initialize('main');
            });
            d3.json('data/id_extracted.json', function (data) {
                dataCenter.id = data;
            });

        });
    });

    // setTimeout(function () {
    //     main.initialize('main');
    // }, 100);
}