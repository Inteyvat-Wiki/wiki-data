// 地图展示的显式导出目录；未列出的场景、地点和区域不会自动进入地图。
// 地点、文字标签与区域行尾注释为源数据简中名称；遮罩组注释仅说明人工目录归类，不进入展示条件。
// labels 单独维护原生文字，不按是否有图标筛选；places 维护地点标记。
// 名称或描述缺失的地点保留为注释，不进入地图展示；双语原文均需完整。
// 二级区域需同时列入其一级父区域。目录仅控制选择，业务数据仍通过 genshin-db 查询。
/** @type {import('./data').MapDirectory} */
const data = {
    "schema": 1,
    "scenes": {
        // #region scene:teyvat 提瓦特
        "teyvat": {
            "source": "scene-3",                                                            // 提瓦特
            // 恢复此前默认的大世界原生红色边界；固定展示，不生成预览选择器。
            "boundary": "resource-boundary-50b527fb400cd13ff9b0c457",
            // 主世界对应多个国家标签；此处采用已核实的地图界面标题。
            "title": {
                "zh_hans": "提瓦特",                                                           // UI_MAP_TABBUTTON_TAB_TIVAT
                "en": "Teyvat",
            },
            // #region maskGroups 遮罩片区；仅整理查看入口，不合并条件或推断互斥。
            // 标记位置由组内每张图片的中心取算术平均，不维护手工坐标。
            "maskGroups": {
                // 地图区域 36；保留该片区的全部图像。
                "mask-area-36": [
                    "resource-atlas-369cd5b35da326e4c3e25a8d",
                ],
                // 地图区域 37；保留该片区的全部图像。
                "mask-area-37": [
                    "resource-atlas-8b100107c34f34e5f0db77a6",
                ],
                // 地图区域 38；保留该片区的全部图像。
                "mask-area-38": [
                    "resource-atlas-7f08e40ca1fd2b13a551d0e4",
                ],
                // 地图区域 39；保留该片区的全部图像。
                "mask-area-39": [
                    "resource-atlas-d41455997d8fd244855d43ff",
                ],
                // 地图区域 40；保留该片区的全部图像。
                "mask-area-40": [
                    "resource-atlas-4668902f6dc3aa2b1605f90a",
                ],
                // 地图区域 41；保留该片区的全部图像。
                "mask-area-41": [
                    "resource-atlas-902e8a390459579e68edbcee",
                ],
                // 地图区域 42、43；同片区的图像变体或相邻组成部分；分别保留显示条件。
                "mask-area-42-43": [
                    "resource-atlas-59f054c37af6fcce131d650a",
                    "resource-atlas-3324ccdb397f2a9699f589d0",
                ],
                // 地图区域 44；保留该片区的全部图像。
                "mask-area-44": [
                    "resource-atlas-c4ac2720b9404d19d7dd1645",
                ],
                // 地图区域 45、46、47、48、49、50；同片区的图像变体或相邻组成部分；分别保留显示条件。
                "mask-area-45-46-47-48-49-50": [
                    "resource-atlas-d1d1f0c9cc0023e3bf03fd5c",
                    "resource-atlas-8d726b2437d893aac569436f",
                    "resource-atlas-8750fe1f45816907675d5f18",
                    "resource-atlas-09d28254a4cc9288858cc798",
                    "resource-atlas-075e5af8032772fd62f3f3d0",
                    "resource-atlas-2b1ac8111ebe13be04362963",
                ],
                // 地图区域 51、52、53；同片区的图像变体或相邻组成部分；分别保留显示条件。
                "mask-area-51-52-53": [
                    "resource-atlas-8d5bcf788704de4510eedf5d",
                    "resource-atlas-3b3c48e9ccc24b5ab1a8ae29",
                    "resource-atlas-5024c8c053e9e52ed95f384f",
                ],
                // 地图区域 54；保留该片区的全部图像。
                "mask-area-54": [
                    "resource-atlas-b93da16b2d05759d889c92d3",
                ],
                // 地图区域 55；保留该片区的全部图像。
                "mask-area-55": [
                    "resource-atlas-31cfeb795e30e9d023522e7d",
                ],
                // 地图区域 56；保留该片区的全部图像。
                "mask-area-56": [
                    "resource-atlas-57abb05a621103e37d13bc7d",
                ],
                // 地图区域 58；保留该片区的全部图像。
                "mask-area-58": [
                    "resource-atlas-44a52e8bddbb9e78c81efe1e",
                ],
                // 地图区域 59；保留该片区的全部图像。
                "mask-area-59": [
                    "resource-atlas-0bd93e5061e236683da41040",
                    "resource-atlas-5770c9073f19df4b07ae52d0",
                    "resource-atlas-afec3622ff3ec4e178ae5e05",
                ],
                // 地图区域 60；保留该片区的全部图像。
                "mask-area-60": [
                    "resource-atlas-23f588c7178eeeee034e77e3",
                ],
                // 地图区域 62、63；同片区的图像变体或相邻组成部分；分别保留显示条件。
                "mask-area-62-63": [
                    "resource-atlas-fbaa3dd275b87f7a5ef04b52",
                    "resource-atlas-8da3a28fdf941139e7fc5853",
                ],
                // 地图区域 65；保留该片区的全部图像。
                "mask-area-65": [
                    "resource-atlas-71e26968ca27941cf78c9838",
                ],
                // 地图区域 66；保留该片区的全部图像。
                "mask-area-66": [
                    "resource-atlas-bb0f262673563f830fee7919",
                ],
                // 地图区域 67；保留该片区的全部图像。
                "mask-area-67": [
                    "resource-atlas-c3a5a519f5d2a724be61a6fe",
                ],
                // 地图区域 68；保留该片区的全部图像。
                "mask-area-68": [
                    "resource-atlas-3553fe90307cdf76f3647252",
                ],
                // 地图区域 71、72、73；同片区的图像变体或相邻组成部分；分别保留显示条件。
                "mask-area-71-72-73": [
                    "resource-atlas-b4a3f9b82829a9352df9f6c7",
                    "resource-atlas-0e30c69874486b229ddd3d3a",
                    "resource-atlas-49da8c1e69299059e2044477",
                ],
                // 地图区域 74；保留该片区的全部图像。
                "mask-area-74": [
                    "resource-atlas-d68eaea7da7ad07ecb3777f8",
                ],
                // 地图区域 75；保留该片区的全部图像。
                "mask-area-75": [
                    "resource-atlas-802460bef83bf23443512d39",
                ],
                // 地图区域 76；保留该片区的全部图像。
                "mask-area-76": [
                    "resource-atlas-5defbd0606f014108f20b365",
                    "resource-atlas-91e412ad28195624b625c00e",
                ],
                // 地图区域 77；保留该片区的全部图像。
                "mask-area-77": [
                    "resource-atlas-f7fcf3f70af4745db9728118",
                ],
                // 地图区域 78、79、80、81、105；同片区的图像变体或相邻组成部分；分别保留显示条件。
                "mask-area-78-79-80-81-105": [
                    "resource-atlas-922f9f41bbaaef7edec5a8bb",
                    "resource-atlas-2c5ef9280c2a877ce5eed460",
                    "resource-atlas-ce1b4626b6d4cc4433c63d4a",
                    "resource-atlas-9bce8a5ca88d2ead1e65155c",
                    "resource-atlas-c70fc9712f88a5727c987d5a",
                ],
                // 地图区域 82、83、84、85；同片区的图像变体或相邻组成部分；分别保留显示条件。
                "mask-area-82-83-84-85": [
                    "resource-atlas-888028d338a8a7e2c4f82732",
                    "resource-atlas-316472c143e36c1de7130233",
                    "resource-atlas-aaf345e09c56fbb5e82a27a0",
                    "resource-atlas-3ee3d63a2973dc04bc206fe6",
                ],
                // 地图区域 86；保留该片区的全部图像。
                "mask-area-86": [
                    "resource-atlas-9703d4e2ed6cd159e49825eb",
                ],
                // 地图区域 88；保留该片区的全部图像。
                "mask-area-88": [
                    "resource-atlas-16a62f1c33af137b1ee03fc9",
                ],
                // 地图区域 96、97；同片区的图像变体或相邻组成部分；分别保留显示条件。
                "mask-area-96-97": [
                    "resource-atlas-81f17a562eab77e8cd9ce2f7",
                    "resource-atlas-587ccdc4174f2aa94383fda5",
                ],
                // 地图区域 98、99；同片区的图像变体或相邻组成部分；分别保留显示条件。
                "mask-area-98-99": [
                    "resource-atlas-d547de94270b137e9b0661ba",
                    "resource-atlas-5ba493e1ad11b2a766448011",
                ],
                // 地图区域 100；保留该片区的全部图像。
                "mask-area-100": [
                    "resource-atlas-d30124a36c5554c728448c34",
                ],
                // 地图区域 101；保留该片区的全部图像。
                "mask-area-101": [
                    "resource-atlas-75fcc5c091f267c1ef7848fb",
                ],
                // 地图区域 102；保留该片区的全部图像。
                "mask-area-102": [
                    "resource-atlas-0174d6c481742f6cd695ffc2",
                ],
                // 地图区域 103、104；同片区的图像变体或相邻组成部分；分别保留显示条件。
                "mask-area-103-104": [
                    "resource-atlas-884fbbfcb00dca3277f88474",
                    "resource-atlas-2e36ec91ba2ba788f2c9d2f5",
                ],
                // 地图区域 117；保留该片区的全部图像。
                "mask-area-117": [
                    "resource-atlas-da48173b0baa0b1fcf1f3f0b",
                ],
                // 地图区域 125、126；同片区的图像变体或相邻组成部分；分别保留显示条件。
                "mask-area-125-126": [
                    "resource-atlas-544439a13df76ce12da92211",
                    "resource-atlas-0e32466ce41df8e6e4167c7b",
                ],
                // 地图区域 139；保留该片区的全部图像。
                "mask-area-139": [
                    "resource-atlas-36aa562907e6f6659cd7c886",
                ],
                // 地图区域 141、142、143、144、145、146、147；整体雾层及其覆盖片区；分别保留显示条件。
                "mask-area-141-142-143-144-145-146-147": [
                    "resource-atlas-83a2b342f2fdac66d5b23b42",
                    "resource-atlas-a58e5f2306adef316d9e8a37",
                    "resource-atlas-6a492bb0f1845c50c91a870d",
                    "resource-atlas-e10c90d341c82d5d78c57164",
                    "resource-atlas-73ed7314f941e8f8d8798f0c",
                    "resource-atlas-6c5c96cd8db2106a683826dc",
                    "resource-atlas-f5762057b5d5d4c110a74c3e",
                ],
                // 分层地图：奎瑟尔的发条工坊·中层 / 奎瑟尔的发条工坊·下层 / 奎瑟尔的发条工坊·入口；按源图层组归类，条件独立计算。
                "mask-layer-group-33605": [
                    "resource-atlas-017248b5b4e366e23ecc5348",
                    "resource-atlas-09a3ae771cc586df13d4def7",
                    "resource-atlas-64b8c0e8577c69eadbd6a7b0",
                    "resource-atlas-64d72cf67b6e0d6d21024d91",
                    "resource-atlas-84edcb2885e2cca0271f6fac",
                    "resource-atlas-9587f23ece76b3197413b650",
                    "resource-atlas-ed3746d656846724952fe1fd",
                    "resource-atlas-f33b80ce496fd4d09f01d674",
                ],
                // 分层地图：神秘的水下遗迹；按源图层组归类，条件独立计算。
                "mask-layer-group-33501": [
                    "resource-atlas-01f284978029ae173bdb410f",
                    "resource-atlas-12cb42b776b7124888d9fa7c",
                    "resource-atlas-35efcf4cfb308ed12cc7b4d6",
                    "resource-atlas-4ca8c815c9af388ce4e98263",
                    "resource-atlas-bc4992960ae312d05f9b6b82",
                    "resource-atlas-ec3a36cd08be51f41b0e5329",
                ],
                // 分层地图：坍塌的隧道；按源图层组归类，条件独立计算。
                "mask-layer-group-16": [
                    "resource-atlas-02df1f83c78553a2aa2f60e8",
                    "resource-atlas-9a412214f6b4b3ec2c2eed18",
                    "resource-atlas-f2ee95008f2b9d98c5f326ea",
                ],
                // 分层地图：隐居处；按源图层组归类，条件独立计算。
                "mask-layer-group-12": [
                    "resource-atlas-0523f509ec9ed1af19b72a0d",
                ],
                // 分层地图：厄里那斯内部；按源图层组归类，条件独立计算。
                "mask-layer-group-33403": [
                    "resource-atlas-081c2971c5e2546da6adda34",
                    "resource-atlas-0bf24beb104644aff137f4a3",
                    "resource-atlas-0f11588a4ffa51a5eb89e336",
                    "resource-atlas-118d3341d17b331763dbd09a",
                    "resource-atlas-9b59d99f4e05713ab6310eb7",
                    "resource-atlas-ae82dd7add4895ed2d983684",
                ],
                // 分层地图：魔女的花园；按源图层组归类，条件独立计算。
                "mask-layer-group-37402": [
                    "resource-atlas-08ad4e1036fd90b4e0549748",
                    "resource-atlas-43c5c199b74d971db2477c32",
                    "resource-atlas-7443ab98104ed924f691f202",
                ],
                // 分层地图：臻冰之山的深处 / 臻冰之山的洞窟；按源图层组归类，条件独立计算。
                "mask-layer-group-24": [
                    "resource-atlas-0b3ab1ce0a0551074f78e55c",
                    "resource-atlas-4de008924c8c0ccc3bc437b2",
                    "resource-atlas-95fb7366650a78a76aa0070b",
                ],
                // 分层地图：荒漠之下的未知洞窟·上层 / 荒漠之下的未知洞窟·下层；按源图层组归类，条件独立计算。
                "mask-layer-group-33001": [
                    "resource-atlas-0bd3e8088d77a780b5087e11",
                    "resource-atlas-92e5a64c0e5ed99411b24512",
                ],
                // 分层地图：火榴树根系·潮冷洞窟 / 火榴树根系·地热的流涌；按源图层组归类，条件独立计算。
                "mask-layer-group-34604": [
                    "resource-atlas-0c3e5171e6a6dc569eb1cf33",
                    "resource-atlas-32c6878d64140c59fdbcb1a9",
                    "resource-atlas-38ce0ade931d6e812caa3af4",
                    "resource-atlas-6bb1fb3752bb5b0bb0ac46ae",
                    "resource-atlas-995fd939b47aac3d9e8c56c4",
                    "resource-atlas-aa75f9d6d87138dd19633d7e",
                    "resource-atlas-d7026e14ff61b819b62cb44c",
                    "resource-atlas-d97a9b6d292f44c924f55e2f",
                ],
                // 分层地图：诡谲的地下设施 / 神秘的遗迹；按源图层组归类，条件独立计算。
                "mask-layer-group-33901": [
                    "resource-atlas-0cce228cc2a553434a7b01e7",
                    "resource-atlas-d045237dd2e96f49b71bcafc",
                ],
                // 分层地图：叩响隐秘门扉之所；按源图层组归类，条件独立计算。
                "mask-layer-group-23": [
                    "resource-atlas-0d008b34bb6552e562fc289c",
                ],
                // 分层地图：梅洛彼得堡·监舍区 / 梅洛彼得堡·生产区下层 / 梅洛彼得堡·管理区 / 梅洛彼得堡·废弃生产区 / 梅洛彼得堡·生产区上层 / 梅洛彼得堡·接待处；按源图层组归类，条件独立计算。
                "mask-layer-group-33601": [
                    "resource-atlas-0f3c03870253c3071f9887e4",
                    "resource-atlas-31fcbf25e6b4e4ec65b1a287",
                    "resource-atlas-545595a365162b403d42c5e8",
                    "resource-atlas-77573c345791cab5a5d87fda",
                    "resource-atlas-842690c2a99b878bd32d518f",
                    "resource-atlas-923364123414a1c2369913b0",
                    "resource-atlas-c1c12145e661bf37ea3ace9f",
                ],
                // 分层地图：达马山遗迹·下层 / 达马山遗迹·上层；按源图层组归类，条件独立计算。
                "mask-layer-group-33205": [
                    "resource-atlas-10726eaaf2783372a0d641f8",
                    "resource-atlas-4c0a0b9af100ea76f32fceab",
                    "resource-atlas-573873345b78c81cc4356606",
                    "resource-atlas-7b5c524ad0aaa95ec6091af1",
                    "resource-atlas-8a763682bb7ff65a7fd166e5",
                ],
                // 分层地图：巡猎者屋下的工坊；按源图层组归类，条件独立计算。
                "mask-layer-group-25": [
                    "resource-atlas-12392965d8413da542cb7800",
                    "resource-atlas-8685a9ff04015f2c82a8bac3",
                ],
                // 分层地图：山中之馆的前厅 / 山中之馆的三楼 / 云上的宫殿 / 山中之馆的二楼；按源图层组归类，条件独立计算。
                "mask-layer-group-11": [
                    "resource-atlas-156fafa51151a8cebed88a1f",
                    "resource-atlas-655b03ebd660d03961be0832",
                    "resource-atlas-8fa29e808d2738ba1b5a812a",
                    "resource-atlas-f38db5e4cdf6e1eeac93f436",
                ],
                // 分层地图：化树民居地下室；按源图层组归类，条件独立计算。
                "mask-layer-group-22": [
                    "resource-atlas-17920a34c735f1ff1351d552",
                ],
                // 分层地图：空洞之梦的破壳处 / 受翼遮蔽的小镇；按源图层组归类，条件独立计算。
                "mask-layer-group-17": [
                    "resource-atlas-1e5d1ba0a2448b4f53cd7c25",
                    "resource-atlas-2387bf8b1be6db1e02e8c909",
                    "resource-atlas-4f3534f1ce95549e0f3f77c0",
                    "resource-atlas-71bc25b086179623b9897b62",
                    "resource-atlas-9a25ac05d3e524561cc4faaa",
                    "resource-atlas-b120fd662f76908d7baa1e67",
                ],
                // 分层地图：水与土之眼·殿堂 / 水与土之眼·上部 / 水与土的洞窟·外围渠道；按源图层组归类，条件独立计算。
                "mask-layer-group-33802": [
                    "resource-atlas-208681636f8a1d3f7823ad4d",
                    "resource-atlas-760a4e924958b70cd07c9102",
                    "resource-atlas-f60c8d5913a30f0d2b78749b",
                ],
                // 分层地图：遗誓者的圣所；按源图层组归类，条件独立计算。
                "mask-layer-group-37010": [
                    "resource-atlas-20d350610bca91c6d639e77e",
                ],
                // 分层地图：鹤观遗迹·上层 / 鹤观遗迹·下层；按源图层组归类，条件独立计算。
                "mask-layer-group-31801": [
                    "resource-atlas-210eaf146f0e95fbb5831565",
                    "resource-atlas-54aec47e2e2656cd163a154c",
                ],
                // 分层地图：祷告的大礼堂 / 通往隐秘之处的道路；按源图层组归类，条件独立计算。
                "mask-layer-group-19": [
                    "resource-atlas-243a20e18f08d69e15e49449",
                    "resource-atlas-665d87248339114bb1a68c23",
                    "resource-atlas-7042cbf4614d26b845ea2287",
                    "resource-atlas-769f57e890995cf77dbb05b4",
                    "resource-atlas-ccd67740cd5738aa58940301",
                    "resource-atlas-ddb26045083e9dbca9d50cbe",
                    "resource-atlas-edbd5b13beb0f75c65d8291c",
                ],
                // 分层地图：隐秘神殿·上层 / 隐秘神殿·下层；按源图层组归类，条件独立计算。
                "mask-layer-group-33201": [
                    "resource-atlas-255d45399defa59a69b6538c",
                    "resource-atlas-a1f42d9b83c418807388e2a6",
                    "resource-atlas-b9eeeddcafdf5f5adb1c677a",
                    "resource-atlas-be68e7e3599ef7d6c8b72e1c",
                    "resource-atlas-ccbb2aff09f3ea6c93edccd3",
                    "resource-atlas-d67f307be714cbced62ed1c8",
                ],
                // 分层地图：秘仪圣殿·未知区域一 / 秘仪圣殿·未知区域二 / 秘仪圣殿·未知区域三 / 秘仪圣殿·未知区域四；按源图层组归类，条件独立计算。
                "mask-layer-group-32701": [
                    "resource-atlas-2a3353c5941f912e00f8bedf",
                    "resource-atlas-33d19f78d2da868ccc51a3f5",
                    "resource-atlas-d15937ae5e35480e0ae2b58a",
                    "resource-atlas-fea21ec9cf725d213421f4c1",
                ],
                // 分层地图：圣途试炼遗迹·分道誓约之地 / 圣途试炼遗迹·入口长廊；按源图层组归类，条件独立计算。
                "mask-layer-group-34302": [
                    "resource-atlas-2b76a8750a3e0386304f4308",
                    "resource-atlas-7185d08056010e9c8c97149e",
                    "resource-atlas-89cf4cc63d56f49189d36a5d",
                    "resource-atlas-9bd52e42b265b5c0f094aec4",
                ],
                // 分层地图：水文数据中枢处理站；按源图层组归类，条件独立计算。
                "mask-layer-group-33703": [
                    "resource-atlas-2ea8096fb7f627ce5e9f458c",
                ],
                // 分层地图：落谷山内·洞窟下层 / 落谷山内·洞窟上层；按源图层组归类，条件独立计算。
                "mask-layer-group-32801": [
                    "resource-atlas-3376345ddf9c917069e04d86",
                    "resource-atlas-91e0d71c3ec8acaf35779567",
                ],
                // 分层地图：幽邃监牢；按源图层组归类，条件独立计算。
                "mask-layer-group-33203": [
                    "resource-atlas-33b5aa7223e7c8699c3b393a",
                    "resource-atlas-c6e5405303a8cd1aae639825",
                ],
                // 分层地图：废弃实验室·遗址下层 / 废弃实验室·遗址外部；按源图层组归类，条件独立计算。
                "mask-layer-group-33701": [
                    "resource-atlas-347bda66708aa6b0945f244a",
                    "resource-atlas-4723a6ca31e6825d0a9d7fb2",
                    "resource-atlas-86e07ae3f3d22a9153eac7e7",
                ],
                // 分层地图：崎岖的水道；按源图层组归类，条件独立计算。
                "mask-layer-group-32303": [
                    "resource-atlas-3a56f0994e9210daa5b65fcd",
                ],
                // 分层地图：杜南纳前进站·下层 / 杜南纳前进站·上层；按源图层组归类，条件独立计算。
                "mask-layer-group-37601": [
                    "resource-atlas-3ce64e5f5a5e74cc93d5bc03",
                    "resource-atlas-69cda33aee83949f9a2c28fe",
                    "resource-atlas-88c2fb3f181cb703c210a36a",
                ],
                // 分层地图：欧蒂克莱尔 / 伊黎耶岛·地下水脉；按源图层组归类，条件独立计算。
                "mask-layer-group-33801": [
                    "resource-atlas-4053e7e248f5f279d63ab956",
                    "resource-atlas-d10a95cb0bbaa8bfb17b4189",
                ],
                // 分层地图：神秘的遗迹；按源图层组归类，条件独立计算。
                "mask-layer-group-33904": [
                    "resource-atlas-427625e3fd6c77ff54ff8f8d",
                ],
                // 分层地图：深秘之地；按源图层组归类，条件独立计算。
                "mask-layer-group-33204": [
                    "resource-atlas-45466a294d0eb539cc076b89",
                ],
                // 分层地图：赤王陵西南·未知区域二 / 赤王陵西南·未知区域三 / 赤王陵西南·未知区域一；按源图层组归类，条件独立计算。
                "mask-layer-group-32704": [
                    "resource-atlas-46a7505b9270f99b2f858b50",
                    "resource-atlas-86515f379eaad931a3c9002d",
                    "resource-atlas-9e28cc0723cb26114f086c96",
                    "resource-atlas-abf42e0a59be7756a11f71a8",
                ],
                // 分层地图：隐秘的通道 / 隐秘的洞窟；按源图层组归类，条件独立计算。
                "mask-layer-group-32101": [
                    "resource-atlas-4b5341f730f60da3d8c9914e",
                    "resource-atlas-a0be2cead2de337e0d999935",
                ],
                // 分层地图：锦落庭；按源图层组归类，条件独立计算。
                "mask-layer-group-34101": [
                    "resource-atlas-551f711be1f94cca37c01def",
                    "resource-atlas-aca8433d74fdf58059e6e9d7",
                ],
                // 分层地图：融雪引流道出入口 / 融雪引流道上层；按源图层组归类，条件独立计算。
                "mask-layer-group-18": [
                    "resource-atlas-5707382741d8d49100046b99",
                    "resource-atlas-7d2ad018d3ce2417283eca4e",
                    "resource-atlas-8a34b8e2e2e84b114f2afe21",
                ],
                // 分层地图：西风骑士团遗迹·地下三层 / 西风骑士团遗迹·地下一层 / 西风骑士团遗迹·地下二层；按源图层组归类，条件独立计算。
                "mask-layer-group-8": [
                    "resource-atlas-5cf5555b7aea1ec003a23e06",
                    "resource-atlas-9bfa1afd28f4feb05ea897f4",
                    "resource-atlas-b6ecdffc577fd228430870a6",
                ],
                // 分层地图：荒漠深底的未知遗迹·其一 / 荒漠深底的未知遗迹·其二；按源图层组归类，条件独立计算。
                "mask-layer-group-33101": [
                    "resource-atlas-5d90ebcc4712ffd3b113a532",
                    "resource-atlas-74342403fc6a63cba5fbb577",
                ],
                // 分层地图：赤王陵西北·未知区域三 / 赤王陵西北·未知区域二 / 赤王陵西北·未知区域一；按源图层组归类，条件独立计算。
                "mask-layer-group-32703": [
                    "resource-atlas-604724a04a9ebf539e639e34",
                    "resource-atlas-67bc30c56075a5c0636393df",
                    "resource-atlas-debb8ee235e9789c392b7f60",
                ],
                // 分层地图：山脉的横裂；按源图层组归类，条件独立计算。
                "mask-layer-group-34304": [
                    "resource-atlas-62c9ace3dc4875383368d2c7",
                    "resource-atlas-73a6bcd1c69c1f21ac180f81",
                ],
                // 分层地图：赤王陵东部·未知区域二 / 赤王陵东部·未知区域一；按源图层组归类，条件独立计算。
                "mask-layer-group-32705": [
                    "resource-atlas-6632fb18ad4922f48d153f78",
                    "resource-atlas-f383ad820671173c4d339d86",
                ],
                // 分层地图：往昔的桓那兰那·未知区域二 / 往昔的桓那兰那·未知区域一；按源图层组归类，条件独立计算。
                "mask-layer-group-32501": [
                    "resource-atlas-6930e187fd3623250bb67cb2",
                    "resource-atlas-7d504253d17a80bf5f67950a",
                ],
                // 分层地图：王山厅·正堂 / 王山厅·秘阁；按源图层组归类，条件独立计算。
                "mask-layer-group-34107": [
                    "resource-atlas-6c8bc02ddc70796ab8069d0c",
                    "resource-atlas-b8f594699d71e3763054e41a",
                ],
                // 分层地图：隐秘的洞窟·其二；按源图层组归类，条件独立计算。
                "mask-layer-group-32402": [
                    "resource-atlas-70580b41b862277d2e5229b9",
                ],
                // 分层地图：神秘的遗迹；按源图层组归类，条件独立计算。
                "mask-layer-group-33902": [
                    "resource-atlas-71b4c808c3245c56fbd1b3db",
                ],
                // 分层地图：旧日古族的统御之所；按源图层组归类，条件独立计算。
                "mask-layer-group-34909": [
                    "resource-atlas-72a27474f65e99bc35a42d5b",
                    "resource-atlas-faa6885b8b78b87157ae0685",
                ],
                // 分层地图：？？？；按源图层组归类，条件独立计算。
                "mask-layer-group-10": [
                    "resource-atlas-73cc922629b9aa1e7c6f1028",
                ],
                // 分层地图：浮土静界；按源图层组归类，条件独立计算。
                "mask-layer-group-34307": [
                    "resource-atlas-75e0afbcc554269cafa02430",
                ],
                // 分层地图：阿兰·吉约丹的安眠处；按源图层组归类，条件独立计算。
                "mask-layer-group-13": [
                    "resource-atlas-7716a1a897eda7aacd8e58d7",
                ],
                // 分层地图：阻勒隘·地下洞窟；按源图层组归类，条件独立计算。
                "mask-layer-group-33002": [
                    "resource-atlas-77b154069c8233c561f994a1",
                ],
                // 分层地图：地下区域；按源图层组归类，条件独立计算。
                "mask-layer-group-32602": [
                    "resource-atlas-79eeda4475853b98ea5d548f",
                ],
                // 分层地图：赤王陵·未知区域三 / 赤王陵·未知区域一 / 赤王陵·未知区域二；按源图层组归类，条件独立计算。
                "mask-layer-group-32702": [
                    "resource-atlas-7eae54d03c435d2b0d03d60e",
                    "resource-atlas-84020f8b40baa5f8c65c90d9",
                    "resource-atlas-c2189852e5467fd9660a48bc",
                ],
                // 分层地图：最后的藏宝地·入口 / 最后的藏宝地·终点 / 最后的藏宝地·门厅；按源图层组归类，条件独立计算。
                "mask-layer-group-37401": [
                    "resource-atlas-871779c0ca577fd87981ac54",
                    "resource-atlas-8b89af7cf81bfff40b0bc4bc",
                    "resource-atlas-e77d279a5b0f4dcee87f0474",
                ],
                // 分层地图：古老的山洞；按源图层组归类，条件独立计算。
                "mask-layer-group-34106": [
                    "resource-atlas-8ab6d1c25992b0623c04a2c1",
                ],
                // 分层地图：「蟹之主的宫殿·下层」 / 「蟹之主的宫殿·上层」；按源图层组归类，条件独立计算。
                "mask-layer-group-37002": [
                    "resource-atlas-8c2aa8de83085de91983cea6",
                    "resource-atlas-c375762aa985ffbec1fbd317",
                ],
                // 分层地图：隐秘的据点；按源图层组归类，条件独立计算。
                "mask-layer-group-32802": [
                    "resource-atlas-8fa87236a84c6ee4713be427",
                ],
                // 分层地图：枫丹廷·水下城墟；按源图层组归类，条件独立计算。
                "mask-layer-group-33503": [
                    "resource-atlas-90aa09b4b9b085e0871367e5",
                    "resource-atlas-9764becb2b38343c64d6f510",
                ],
                // 分层地图：靡穷深壑；按源图层组归类，条件独立计算。
                "mask-layer-group-37500": [
                    "resource-atlas-a00b6f8f639be79a633635e8",
                    "resource-atlas-a88f19452c86b472fa9f7408",
                ],
                // 分层地图：银月之庭；按源图层组归类，条件独立计算。
                "mask-layer-group-37016": [
                    "resource-atlas-afdac22a3a44da6e42e3d211",
                ],
                // 分层地图：舍身步道·遗迹上层 / 舍身步道·遗迹下层；按源图层组归类，条件独立计算。
                "mask-layer-group-32601": [
                    "resource-atlas-b112ac65315e48489791ff04",
                    "resource-atlas-e19be30459e42095797db25c",
                ],
                // 分层地图：统律之心·密道；按源图层组归类，条件独立计算。
                "mask-layer-group-34902": [
                    "resource-atlas-ba292382c4c929104cd837fd",
                ],
                // 分层地图：神秘的遗迹；按源图层组归类，条件独立计算。
                "mask-layer-group-33903": [
                    "resource-atlas-bd54d645365dd99bd2cf8318",
                ],
                // 分层地图：众岩之里；按源图层组归类，条件独立计算。
                "mask-layer-group-34301": [
                    "resource-atlas-be8623b2fd6fb6809b8f6b79",
                ],
                // 分层地图：报偿之河；按源图层组归类，条件独立计算。
                "mask-layer-group-33504": [
                    "resource-atlas-c6512d158d2ed10221deee12",
                ],
                // 分层地图：万水之源·大枫丹湖；按源图层组归类，条件独立计算。
                "mask-layer-group-33401": [
                    "resource-atlas-cddcaec1be9da282a36e1b4c",
                ],
                // 分层地图：传说中的天蛇船；按源图层组归类，条件独立计算。
                "mask-layer-group-34901": [
                    "resource-atlas-d3a9d9e001e663717e4c9059",
                ],
                // 分层地图：水天丛林·地下洞窟；按源图层组归类，条件独立计算。
                "mask-layer-group-32302": [
                    "resource-atlas-dac8efbac34b04912fcfaa88",
                ],
                // 分层地图：神柱的根系；按源图层组归类，条件独立计算。
                "mask-layer-group-37404": [
                    "resource-atlas-dca00ff193c80ee1ea7f6eae",
                ],
                // 分层地图：沉珑渊府；按源图层组归类，条件独立计算。
                "mask-layer-group-34103": [
                    "resource-atlas-e16c1a37a1f8825d02945c64",
                ],
                // 分层地图：绝海之下；按源图层组归类，条件独立计算。
                "mask-layer-group-37008": [
                    "resource-atlas-e37938a1762d6ccc64f0d43c",
                ],
                // 分层地图：茸蕈窟·南面洞窟；按源图层组归类，条件独立计算。
                "mask-layer-group-32003": [
                    "resource-atlas-e56f33972f777893b713adae",
                ],
                // 分层地图：无郁夷摩·隐匿之地；按源图层组归类，条件独立计算。
                "mask-layer-group-32005": [
                    "resource-atlas-e70bb525fc309097db4d0589",
                ],
                // 分层地图：隐秘的洞窟·其一；按源图层组归类，条件独立计算。
                "mask-layer-group-32401": [
                    "resource-atlas-eb86c5fd2c1797ff3ce3e5fa",
                ],
                // 分层地图：茸蕈窟·北面地下遗迹；按源图层组归类，条件独立计算。
                "mask-layer-group-32004": [
                    "resource-atlas-ed0fb6e52693e6759e59be27",
                ],
                // 分层地图：宏伟巨树的内部；按源图层组归类，条件独立计算。
                "mask-layer-group-33104": [
                    "resource-atlas-feacedd73b9249f7449b9ca2",
                ],
            },
            // #endregion maskGroups
            "labels": [
                // #region labels 原生地图文字；本身不需要图标。
                "map-place-010bab55e1d573dd470fb038",                                       // 沙中故里
                "map-place-0781eb58844a2bc6d8272ca2",                                       // 失梦的国土
                "map-place-08598ba2d5b0e0dcb4438785",                                       // 沙中故里
                "map-place-085cee4dd2c020575b242686",                                       // 安提库旧港
                "map-place-08d87dc3f8540582fc7121ee",                                       // 沙中故里
                "map-place-095af7a64883d10460042026",                                       // 失梦的国土
                "map-place-0ba5450ec430a7d93a1d0107",                                       // 沉珑渊
                "map-place-0cda0221694748941626e494",                                       // 失梦的国土
                "map-place-0ce81de7d5f8234b1b1ac11f",                                       // 沙中故里
                "map-place-0da818514fa9334077d14550",                                       // 失梦的国土
                "map-place-0dde95411c86f3643e2a29d9",                                       // 「天火之冠」
                "map-place-0e6799c401db1bd552558e4e",                                       // 沙中故里
                "map-place-0e71b5ff0430214540cd64a1",                                       // 失梦的国土
                "map-place-0f63d14d9b5426bec29bb5d3",                                       // 沙中故里
                "map-place-0f944f14da3cb046e6ade73a",                                       // 沙中故里
                "map-place-101a9bc93c0e7d2a54d25acf",                                       // 刺梨小径
                "map-place-102a5269431893a6af54a64c",                                       // 失梦的国土
                "map-place-10abafb7e8ec745e5e46b322",                                       // 沙中故里
                "map-place-12011b1d8261290f3e41b289",                                       // 沙中故里
                "map-place-13a4b8b029ee0eb36255a3ae",                                       // 失梦的国土
                "map-place-144808f9e7bb7d46e8dd23ec",                                       // 沙中故里
                "map-place-1501123c84534da475dabbca",                                       // 失梦的国土
                "map-place-1a15546879055b7b8103eddf",                                       // 沙中故里
                "map-place-1ccf66873f0bd132a76f6886",                                       // 梅洛彼得堡
                "map-place-21521ec979a3e02406d5eb08",                                       // 失梦的国土
                "map-place-2178d1046ac2108463d9d361",                                       // 失梦的国土
                "map-place-21f29c594e68c0aab5c7f9ab",                                       // 沙中故里
                "map-place-22d3dea510a2b7ff74cd70d0",                                       // 失梦的国土
                "map-place-23d56fa0a6381832fb606f91",                                       // 失梦的国土
                "map-place-241ad7f5585259608de95d12",                                       // 沙中故里
                "map-place-250048bf6a33928f43542fa3",                                       // 沙中故里
                "map-place-27e45adb4dbcdc7806002625",                                       // 沙中故里
                "map-place-28371fb7e632a8a923b75818",                                       // 失梦的国土
                "map-place-28c3084b6648a2248f80f750",                                       // 梅洛彼得堡
                "map-place-29cec1ac1e68b74fbb3b86e2",                                       // 觐山古道
                "map-place-2ae572c50eb48f38b0d4ed1d",                                       // 失梦的国土
                "map-place-2b2cd1a1ea81a35429fc84d6",                                       // 生栖树沼
                "map-place-2b46f5ade7cf6241bfbe9912",                                       // 塔拉塔海谷
                "map-place-2b4f3aa36077d4b0e1f063b9",                                       // 沙中故里
                "map-place-2b61caea199a0e25faa60e2d",                                       // 沙中故里
                "map-place-2d359995f92364bb5a685d21",                                       // 沙中故里
                "map-place-2d6525569762c4fffb950a21",                                       // 失梦的国土
                "map-place-2de9259edcf19d35f5d0363a",                                       // 失梦的国土
                "map-place-2e76cf35dc5834ec9519bde8",                                       // 沙中故里
                "map-place-3044673374eaa6bf7ff53d93",                                       // 失梦的国土
                "map-place-3051db2335b838125f759f2a",                                       // 沙中故里
                "map-place-30d10035fad92738e3dda48c",                                       // 沙中故里
                "map-place-3406e42df278bfff5711786d",                                       // 沙中故里
                "map-place-355c2e4a6f4e7becb5aeb6e1",                                       // 失梦的国土
                "map-place-36c4d9f495bd5cfa955228de",                                       // 失梦的国土
                "map-place-36ec6f0ae71f4933e44ad3de",                                       // 失梦的国土
                "map-place-37066adc74c11be9671242f4",                                       // 梅洛彼得堡
                "map-place-39198c196698a031f47df656",                                       // 失梦的国土
                "map-place-39f8b60b0a6d55e12d74f993",                                       // 奥古洛夫镇
                "map-place-3a24e70367749dacb4f6898a",                                       // 失梦的国土
                "map-place-3abb8f8191c8b71c56dda483",                                       // 沙中故里
                "map-place-3deb710ed93070585a3d653e",                                       // 失梦的国土
                "map-place-42de4a3e22ebc9ef0a5c0f0a",                                       // 失梦的国土
                "map-place-442638dbf577d21423d19f1c",                                       // 沙中故里
                "map-place-4520cab2d3e704f64a3cca0c",                                       // 梅洛彼得堡
                "map-place-45718cd7f2af9ac4872478ca",                                       // 「乔克力」宫
                "map-place-4725f1304c17974185f70aba",                                       // 失梦的国土
                "map-place-4747c2ec16a91afb90686be2",                                       // 褪色古堡
                "map-place-47526054abf84e17c743c94c",                                       // 沙中故里
                "map-place-47ab2e1f1e4265e3e67aad57",                                       // 梅洛彼得堡
                "map-place-48c02737457d769a9b48b882",                                       // 失梦的国土
                "map-place-4a0030292966ed402100133a",                                       // 自然哲学学院
                "map-place-4c394d2999cc483996edd35a",                                       // 希望之路
                "map-place-4e8b7ebd1a5b65122d4e6ed9",                                       // 奥古洛夫镇
                "map-place-526810ca7ad4e544312221ae",                                       // 沙中故里
                "map-place-5288dd198a23aa478f6de3ff",                                       // 沙中故里
                "map-place-535260a3fc3bee960f46221f",                                       // 沙中故里
                "map-place-544506cc0b5f3adb851f9f20",                                       // 沙中故里
                "map-place-592dfb133842d6f1d9f3d93b",                                       // 失梦的国土
                "map-place-5b4247a9a5a28c698aec6984",                                       // 沙中故里
                "map-place-5bb8b7470b2ecd51aac77f3a",                                       // 失梦的国土
                "map-place-5dee39e5c07677e8fa646c56",                                       // 失梦的国土
                "map-place-5f0a7d86fccb3ad422139a52",                                       // 沙中故里
                "map-place-60b2243ddec44ce8f8917696",                                       // 沙中故里
                "map-place-616d77fac9195bf65242360a",                                       // 沙中故里
                "map-place-61e7281c3c17692b8129a8c9",                                       // 梅洛彼得堡
                "map-place-62b667c387e2917357614fd1",                                       // 失梦的国土
                "map-place-63d2bd03f297f1be68f358eb",                                       // 沙中故里
                "map-place-63e60830b5fa79380c23df89",                                       // 刺梨镇
                "map-place-68610b83f9f0e991e8f455f5",                                       // 失梦的国土
                "map-place-68f0a5cba95fe65cddfc7c0f",                                       // 失梦的国土
                "map-place-6f498a8001e5efd4b7454d46",                                       // 沙中故里
                "map-place-6fceb97f1416b6ba9970af6f",                                       // 失梦的国土
                "map-place-7412c80d35bfb41ec8d1f5a5",                                       // 沙中故里
                "map-place-74e61767fb32710338aef360",                                       // 「很明亮的地方」
                "map-place-75130b0b26bafe66ebb2a538",                                       // 失梦的国土
                "map-place-751f3be5209b3d26e28fa51d",                                       // 梅洛彼得堡
                "map-place-7528d331193f29b81da027b6",                                       // 失梦的国土
                "map-place-77a8f46c520cbbce56a6fc7e",                                       // 失梦的国土
                "map-place-7c0dfc9c215c3f832c7efa06",                                       // 沙中故里
                "map-place-7cfcd30115c5befd8b50c53c",                                       // 沙中故里
                "map-place-7d62faa88793fd7c168f5b8f",                                       // 失梦的国土
                "map-place-7ee2c251a011db8fa81e1f2f",                                       // 安眠处
                "map-place-7f24586ac5dcfc47883cfb47",                                       // 灵枢庭
                "map-place-817033eb7cd677040952edbc",                                       // 沙中故里
                "map-place-82a5ccf8f79303f477d44089",                                       // 醅幽蜜库
                "map-place-836b4d9ed2e6e14509597758",                                       // 失梦的国土
                "map-place-84b0b71b6634f9a83ca8816c",                                       // 沙中故里
                "map-place-84d4c44b49d4f12f91387f68",                                       // 沙中故里
                "map-place-85c43e9d8439fd043e33a4ad",                                       // 沙中故里
                "map-place-8692ee21d6cef2ffbe6b20c1",                                       // 失梦的国土
                "map-place-88126e6f1ebbecc21018f523",                                       // 褪色古堡
                "map-place-89311a91aaae518eab079210",                                       // 沙中故里
                "map-place-8d2ba7f6da3c6d2c399614f5",                                       // 海沫村
                "map-place-8d7e85e681e8ed7fc5c7869a",                                       // 失梦的国土
                "map-place-8ecce2f90cf6b8a5532a2f89",                                       // 褪色古堡
                "map-place-8f0da45aab4fbabbdbaa1b42",                                       // 失梦的国土
                "map-place-912622f3e781f2c35dcf118a",                                       // 失梦的国土
                "map-place-928ae992479ee9f32a21d678",                                       // 失梦的国土
                "map-place-93b1d4ba0922fb8dd8438d0f",                                       // 埃尔顿海沟
                "map-place-93c772d958446843bf7576ea",                                       // 沙中故里
                "map-place-95a2d9a769ebf19d2c4b2c8a",                                       // 沙中故里
                "map-place-961d34b684c1b8511ee3a7f5",                                       // 锦落庭
                "map-place-966314610b207a80d32f74e0",                                       // 沙中故里
                "map-place-970a1f3a9227ddc6bc82b697",                                       // 失梦的国土
                "map-place-97cf47f34ada17a6673288dd",                                       // 伏仙洞
                "map-place-99bb33237662b65cf03c04a3",                                       // 失梦的国土
                "map-place-9bda62d47b6ee514aa8a1732",                                       // 沙中故里
                "map-place-9d0b61b3009f2c677bd668ee",                                       // 安眠处
                "map-place-9d9b1d4af8e6580b1e8be8e3",                                       // 失梦的国土
                "map-place-9f29a82d06c25d88da8ec4b9",                                       // 失梦的国土
                "map-place-9ffa3e82ddce278987c58514",                                       // 沙中故里
                "map-place-a0f0a49850119126faecde3e",                                       // 失梦的国土
                "map-place-a2960f56f17abac410c08900",                                       // 失梦的国土
                "map-place-a45c9f0016fd70835bba3226",                                       // 失梦的国土
                "map-place-a4d0bf2d51f97b4ab01cfc14",                                       // 沙中故里
                "map-place-a5b7056a17d9877f47ebc87c",                                       // 沙中故里
                "map-place-a5f1e5f7cb789991aecf3281",                                       // 失梦的国土
                "map-place-a61e6f8ee7cd381daebe4b78",                                       // 失梦的国土
                "map-place-a6d7e547430f6f3161ca0883",                                       // 沙中故里
                "map-place-a8c1f50f4f14a7efa64c2dfa",                                       // 褪色古堡
                "map-place-a96a1516111161638d80c551",                                       // 「特别温暖的地方」
                "map-place-af957c31472de5d921593417",                                       // 失梦的国土
                "map-place-aff0f2cc72aa655a695de542",                                       // 沙中故里
                "map-place-b0ce7416388685d5504d14bc",                                       // 失梦的国土
                "map-place-b38283381aaf6113f4321ef6",                                       // 安提库旧港
                "map-place-b3c8081c65b914ed058706dc",                                       // 沙中故里
                "map-place-b57e85bbf62b09cffd200060",                                       // 自体自身之塔
                "map-place-b6f3122a000f73a0da426273",                                       // 沙中故里
                "map-place-b7690c6cef51d95ffd877ed4",                                       // 失梦的国土
                "map-place-b7913a565371bdaa4cdda3bf",                                       // 失梦的国土
                "map-place-ba2b6498f2f366cd31c9bd39",                                       // 沙中故里
                "map-place-bbe21421c5452b06342681d1",                                       // 失梦的国土
                "map-place-bc4a077aa814813231d0519b",                                       // 传说中的天蛇船
                "map-place-bc52aa66e383c6cd3d5af531",                                       // 失梦的国土
                "map-place-bc8ad2b394cd3099475c7711",                                       // 云上的祭台
                "map-place-bcd304c7ca9b105e80fbe575",                                       // 塞洛海原
                "map-place-bd144369a9d069055fa56574",                                       // 沙中故里
                "map-place-be48338cbac0ea1ad0183cd2",                                       // 失梦的国土
                "map-place-c1a84fa007eb3f379e01cb62",                                       // 失梦的国土
                "map-place-c8a7b4670e3044f6d983a11a",                                       // 沙中故里
                "map-place-ca40d7022084b62687167d81",                                       // 沙中故里
                "map-place-cc87df4f65ac37820dfb6cd1",                                       // 沙中故里
                "map-place-d02b936c80cfb014a9e5228e",                                       // 沙中故里
                "map-place-d0755befffc04fb66fb2f956",                                       // 失梦的国土
                "map-place-d33c16133621c34842883fc3",                                       // 彩彩洞
                "map-place-d5a77f86c5d2ef8566baf2c1",                                       // 沙中故里
                "map-place-d6beac3c3e029c936f58d16f",                                       // 沙中故里
                "map-place-d6ff1429e9c28c5cb1fd5290",                                       // 失梦的国土
                "map-place-d9454cb2110b5e1544a7f5e6",                                       // 沙中故里
                "map-place-da4f5b7b79e1037930f34db3",                                       // 失梦的国土
                "map-place-db31770dd45bbb34c2ef5b10",                                       // 失梦的国土
                "map-place-dc1118ccd0c282fa56aba511",                                       // 失梦的国土
                "map-place-dc6b012366929310d88c46dc",                                       // 沙中故里
                "map-place-dce908e57e9678949d962fd2",                                       // 沙中故里
                "map-place-df2fa4332d85c9d8173f1629",                                       // 失梦的国土
                "map-place-e1218f128a58e5ae48277219",                                       // 沙中故里
                "map-place-e21774b528df40ed4a3cf268",                                       // 沙中故里
                "map-place-e21f929ff6b8e2f31f3ce92c",                                       // 失梦的国土
                "map-place-e3d09c65bcff5adfab98f7f9",                                       // 沙中故里
                "map-place-e46871b01e5360d0f4221ce7",                                       // 失梦的国土
                "map-place-e7924bb835124a8bcdcf4558",                                       // 沙中故里
                "map-place-ebbffd98477397f5ed5a51b5",                                       // 「寂寞的地方」
                "map-place-ec5e1186da77f5420f1e05ba",                                       // 切萨勒姆宫
                "map-place-ed0841f6c48cc65cdb0daf4a",                                       // 荧草窟
                "map-place-eeba8ac3beb10bb73562aab3",                                       // 失梦的国土
                "map-place-f28eee22633e9931126ff54e",                                       // 失梦的国土
                "map-place-f44d993df0383cb57cf07a20",                                       // 失梦的国土
                "map-place-f4d00f95af5c6ec9d48580ae",                                       // 觐山古道
                "map-place-f50bf4a117bc2ddccd2066dd",                                       // 沙中故里
                "map-place-f5373312053eeaec1e6f1853",                                       // 失梦的国土
                "map-place-f7612cacdeb7f70fc3da6e2c",                                       // 失梦的国土
                "map-place-f7c99016d6b9694ddbddc236",                                       // 隐匿的谜土
                "map-place-fb7435686ca62e5fcfefb6a2",                                       // 沙中故里
                // #endregion labels
                // #region surfaceLabels 地表及独立场景原生文字
                "map-place-002fc922068d8dd0407ed8c8",                                       // 提提岛
                "map-place-007d945a5dedb6c9b4d16213",                                       // 平海砦
                "map-place-01296ce8b62b9f736ee78e95",                                       // 「冬契军」总部
                "map-place-014c5ac3f10c13e93a01b0b0",                                       // 暝垣山
                "map-place-01e44084015e40d3c113a6ad",                                       // 珊瑚宫
                "map-place-01f06eeeaf65590a8e188682",                                       // 层岩巨渊
                "map-place-02b289cd60f9ab2e46bd2815",                                       // 荒海
                "map-place-02bd30ea952c229e130ed2d4",                                       // 维摩庄
                "map-place-0344c7f38c554cec6fdaff74",                                       // 茸蕈窟
                "map-place-03f43d78d49f18c34043776d",                                       // 翘枝崖
                "map-place-048b500a387719e966038a6f",                                       // 至冬宫
                "map-place-05ede87d9b43bc3a3c434a76",                                       // 稻妻城
                "map-place-060b0993d94642e891945496",                                       // 秋分山东侧
                "map-place-0853b9faca771ab3a99ed2d2",                                       // 亡者狭廊
                "map-place-09a30b16e5370a8899a88a42",                                       // 海屑镇
                "map-place-0b57097a0c0713ac23ed0786",                                       // 舍身步道
                "map-place-0b6b098d5e689e5e05f0ea97",                                       // 清泉镇
                "map-place-0cf22a8d19aba4745a8140cc",                                       // 饱饮之丘
                "map-place-0d445f1e40ccca31ebf6945b",                                       // 枫丹廷区
                "map-place-10be0b36d1bfd248841ca930",                                       // 须弥城
                "map-place-1115fd50204b03bed4c80c48",                                       // 跋松顶
                "map-place-124c86845a4322d6ab4f6adf",                                       // 下风蚀地
                "map-place-1559282031f64b8743c94c7a",                                       // 无想刃狭间
                "map-place-1682655828a943d68336bb06",                                       // 浅濑神社
                "map-place-16c1fb92fbdfac8a05586fc0",                                       // 影向山
                "map-place-17e8f35863a9fe0f2a90d4a2",                                       // 圣火竞技场
                "map-place-1a33fc72830c1c919b98aa50",                                       // 悬练山
                "map-place-1acaf129ef77e41fa6f3a01a",                                       // 「回声之子」
                "map-place-1b3683402c507ba2bab3a4e9",                                       // 水月池
                "map-place-1bd2b501727917e511a091e6",                                       // 伏鳌谷
                "map-place-1c602009b9ec87deb8b945d9",                                       // 伦波岛
                "map-place-1cc8826a47f6e0cb55e23c53",                                       // 华光林
                "map-place-1e19f6086f9f555a5cf6d2f2",                                       // 甘金岛
                "map-place-1e446d6a63d82eec47e93a2a",                                       // 菅名山
                "map-place-1e809a15fea04ff4ceb36907",                                       // 曚云神社
                "map-place-1ee6fb0f6a6a2566ed46a43d",                                       // 果酒湖
                "map-place-1eea0fedb48d4b01fa948fc7",                                       // 涌流地
                "map-place-1f666660d536be99985dc278",                                       // 沙之眼
                "map-place-1fde978851a794763bb50f8d",                                       // 低语森林
                "map-place-21bfe0cabbaab8db4827fbcb",                                       // 荼诃之座
                "map-place-2307391edc8796ef146f486f",                                       // 九条阵屋
                "map-place-247f23fc0094866cb02e3456",                                       // 聚香海岸
                "map-place-2553ada8b4859ad46ba72210",                                       // 雪葬之都·旧宫
                "map-place-2604aa374bc95acc2d6d281e",                                       // 巡猎者木屋
                "map-place-2611e3329b36f63aaadc4060",                                       // 蒙德城
                "map-place-264aa11cad6d58e448ea2c90",                                       // 浪浪湾
                "map-place-27f6062cc010691c1423ddf3",                                       // 终夜长茔
                "map-place-284326f7173f4553b77074b6",                                       // 南天门
                "map-place-2b2443a0dfd0d9e6a4002b41",                                       // 荼诃落谷
                "map-place-2bd9632d72d0f4e4899a6cbb",                                       // 新枫丹科学院
                "map-place-2caaeb77c5e9ae7a2e91ab68",                                       // 刃连岛
                "map-place-2d7fe259b1518c09bfa02fc0",                                       // 阿陀河谷
                "map-place-2e5f3517cf621ea599a930a4",                                       // 孤云阁
                "map-place-2eaa16915080372f2b5844c2",                                       // 风龙废墟
                "map-place-2f346c431e5640313f19903b",                                       // 空寂走廊
                "map-place-2f8eab07d583885ca4164ebc",                                       // 星落湖
                "map-place-3009036eff1340e866281f53",                                       // 列柱沙原
                "map-place-309ebba50fd16a12ea742727",                                       // 琼玑野
                "map-place-30da0e575e8d34aca300d1f3",                                       // 明蕴镇
                "map-place-319e9f7adce01d6086074c69",                                       // 刺梨岩
                "map-place-3229a69ae80f31691cdf960b",                                       // 荻花洲
                "map-place-3337fec138cbb416ce8246d6",                                       // 卡布狄斯堡遗迹
                "map-place-34a8ca1f877b3c3cdad878ba",                                       // 巨人峡谷
                "map-place-35301de2b7e3869d013f9fb3",                                       // 避让之丘
                "map-place-35a411348db1dfc8546ace50",                                       // 无郁稠林
                "map-place-3623d89cad7608455dc13c36",                                       // 绯木村
                "map-place-39172d66809730fdcc931a83",                                       // 苍晶区
                "map-place-39aa72ca218341dc45022ecc",                                       // 鹤观
                "map-place-3a9490d77c0a683e0e9e079d",                                       // 往昔的桓那兰那
                "map-place-3ca41e3ca47d0e9d79abfb43",                                       // 阿如村
                "map-place-3dee2ef69ddac7aa0a6a63ee",                                       // 星荧洞窟
                "map-place-3e6a6f3dca593f6cc646e6b2",                                       // 至冬堡
                "map-place-3ebb9683d07f2639386845b0",                                       // 窃火者密岛
                "map-place-3f060236127201c1c4f07736",                                       // 悠悠集市
                "map-place-417bfa8419dde55f18d5ee70",                                       // 觉王之殿
                "map-place-418db80e15cf30eeb1059b39",                                       // 刻拉蒂之眼
                "map-place-41fc5fe1a704f8c8adc45bbb",                                       // 地面矿区
                "map-place-420fda7992a62a31a8a4778f",                                       // 浮羽之湾
                "map-place-43f870d0367298ba199ea632",                                       // 惑饲滩
                "map-place-460b0d4ddaad4d75418db9dd",                                       // 坠星山谷
                "map-place-469b12e8ec4402b09b07fbfa",                                       // 黎翡区
                "map-place-469c2aee0c42f1f6ec161af2",                                       // 奥藏山
                "map-place-46ca70e86727aacb640217dc",                                       // 鸣神大社
                "map-place-46f561d6c1f3a831753fd4cb",                                       // 秋分山西侧
                "map-place-47065198c122113d40e748cc",                                       // 奥摩斯港
                "map-place-47498ec00c1120c29f1aaaca",                                       // 琥牢山
                "map-place-474f6fe0fef5c28244215e95",                                       // 覆雪之路
                "map-place-4977b2973f8c683a386a5e61",                                       // 格鲁波夫
                "map-place-49820a7c0ea9e367976cb237",                                       // 绝云间
                "map-place-49acb3494e1851ebc20636f6",                                       // 折胫谷
                "map-place-4a4fb9da2dedcd3096d127db",                                       // 「清籁丸」
                "map-place-4b294f39a0a31350ae7fc609",                                       // 沉玉谷·上谷
                "map-place-4d3918784316020ccb832397",                                       // 越石村
                "map-place-4d5dba113615ccdcbcec08a5",                                       // 赤望台
                "map-place-4d64e958765e573dd764940e",                                       // 千壑沙地
                "map-place-4d9c9d0ff5e5a64d713248e1",                                       // 眠龙谷
                "map-place-4e90006d90b2615d5a3f3b6d",                                       // 特辖地研究所
                "map-place-5098d40a0b589f7efa93b0e8",                                       // 桓那兰那
                "map-place-51275efc79df51fc0f557329",                                       // 啁哳之沙
                "map-place-51308dc7fdc5d56a6f5b0191",                                       // 轻策庄
                "map-place-518610c6b383daaa130775cf",                                       // 寒天之钉
                "map-place-522572733bfdb6a8f9863f00",                                       // 名椎滩
                "map-place-52868de0203510d40d471665",                                       // 绀田村
                "map-place-52c63239add579476f3cb4e6",                                       // 雾灵渚
                "map-place-532cf4b856dee0ea5f9d65ae",                                       // 清籁岛
                "map-place-547d598edcfd18b616c15df7",                                       // 白狐之野
                "map-place-578b930f4fb6dc2c0cbc3948",                                       // 喀万驿
                "map-place-57ca566939ebdee6b917c567",                                       // 白桦雪葬地
                "map-place-59ad33eef889dfd433d180bb",                                       // 天衡山
                "map-place-5b01b175f61758a219e8c70a",                                       // 彩冰镇
                "map-place-5b9c89127ba3a0874eb35f75",                                       // 科洛列夫茨基剧院
                "map-place-5bb0b8665a172cea2456231f",                                       // 上风蚀地
                "map-place-5be16ff2e12f588b0dc01459",                                       // 风起地
                "map-place-5ddab7a8523aeabcdd7dd5b8",                                       // 桓那兰那
                "map-place-5e2baed570b9c1a194586590",                                       // 悠悠度假村
                "map-place-5e4626cf1b495cf3f357c925",                                       // 碧水原
                "map-place-5ee9a537e6ca5d3655261937",                                       // 璃沙郊
                "map-place-5fb6c369d4c32b582897907b",                                       // 二净甸
                "map-place-605367738055adc142313d65",                                       // 沉玉谷·南陵
                "map-place-6104cdcbb051589864c2ea03",                                       // 笈名海滨
                "map-place-633770545362db5af040ebdf",                                       // 灵濛山
                "map-place-637da39e7fae0a883c9a804b",                                       // 曙光车站
                "map-place-64024678b7c4d05074c315c6",                                       // 永凝冻土
                "map-place-64b64ccea34c429e76878449",                                       // 遗珑埠
                "map-place-64cea8e6edd64b1f4156043c",                                       // 铁穆山
                "map-place-64d08acce909cfbde561432d",                                       // 鹰翔海滩
                "map-place-65d9838877307688defdc205",                                       // 丰饶绿洲
                "map-place-669ad7a119b45e4a1b6f1eb3",                                       // 失落的苗圃
                "map-place-672c12d960de189c19f2d3b8",                                       // 「花羽会」
                "map-place-67692d22c5e54e8f8fc2ba43",                                       // 露景泉
                "map-place-68499e4deddcccca44bf34e1",                                       // 茉洁站
                "map-place-6989a99517beef285f320679",                                       // 那夏镇
                "map-place-6c6a9d6480eba863757c2283",                                       // 珉林
                "map-place-6c76e41bfbe47d6a6cb638bc",                                       // 天臂池
                "map-place-6e4ac87e66e4eff274a1e382",                                       // 天遒谷
                "map-place-7097a1738c25024158b7d171",                                       // 海露港
                "map-place-718848236c9a09be2df65ba3",                                       // 枫丹动能工程科学研究院区
                "map-place-73b6651a10a14cc14ad3966c",                                       // 逐浪野
                "map-place-7419e4d433fa1f2419c7de81",                                       // 蛇骨矿洞
                "map-place-744be52f1b67cf169d80f2da",                                       // 石火坠陨处
                "map-place-74818e5248aca83f3fb51d0c",                                       // 霜精的村落
                "map-place-759b9e09e08c873cb6f8cca7",                                       // 踞石山
                "map-place-76f8704e4a284f5f46787a1e",                                       // 庆云顶
                "map-place-77ab78a2648b6f845f684590",                                       // 云来海
                "map-place-78390a55ba3ebdf583e06654",                                       // 风车镇
                "map-place-79d1fbda0fd212f0b57a2bab",                                       // 丹砂崖
                "map-place-7a05c7413aa0cc09b3397522",                                       // 星砂滩
                "map-place-7b1757272d50621bed4946e0",                                       // 藤兜砦
                "map-place-7bf63c984eea90d2bec79271",                                       // 蛇神之首
                "map-place-7c8663c04755d091dbaeeb0b",                                       // 凝露镇
                "map-place-7dbfb287db3cdc7243c89294",                                       // 凯雷丝之翼
                "map-place-7ed955bd37cd0223d88d6bff",                                       // 石门
                "map-place-7fb759841e19ac57757839dc",                                       // 神里屋敷
                "map-place-8092940a8931bfe760eff82c",                                       // 道成林
                "map-place-818d4c2750f678c2e65f65fa",                                       // 来歆山
                "map-place-82dcc7df6460202f3010495b",                                       // 渌华池
                "map-place-834077ffc3b26a90d1fd6cbd",                                       // 希汐岛
                "map-place-857e6755082aa0343f5a7575",                                       // 硫晶支脉
                "map-place-8597ff154f6d1986d2732b09",                                       // 护世森
                "map-place-85db5336ec3590833323ab46",                                       // 优兰尼娅湖
                "map-place-875961bb867340cb49428ad8",                                       // 香醉坡
                "map-place-8aacda7cf4c6e65d9a199e2c",                                       // 无妄坡
                "map-place-8b016345e2f6a86bbef7a6e2",                                       // 疗养院旧址
                "map-place-8b8938045415a37e9391381b",                                       // 列车总站
                "map-place-8ba729884656d43a294f831c",                                       // 晨曦酒庄
                "map-place-8f90eb97112349b9a9f11545",                                       // 鸣神岛
                "map-place-916e59d246f44c112b854ea5",                                       // 甘露花海
                "map-place-91f15faf7bb6c0a15a4a6d34",                                       // 白淞镇
                "map-place-942d8c5e405ae60dcfda0dac",                                       // 西风戍垒
                "map-place-94c49ab6dd21fd7cc3738510",                                       // 翘英庄
                "map-place-95193b426cecb382c32fabab",                                       // 明冠峡
                "map-place-96670ddd26782853be773266",                                       // 琉璃峰
                "map-place-96b3ed6c5960ef0e22f822e5",                                       // 「流泉之众」
                "map-place-980d08e89207a93b32b0d564",                                       // 谒颂幽境
                "map-place-983de90fbe61e4941ea38700",                                       // 无明砦
                "map-place-98e01c56ee0b44361d886a3e",                                       // 降诸魔山
                "map-place-99ec18751f23b2db13604537",                                       // 灵矩关
                "map-place-9a5d90b4a4734db5b4218adc",                                       // 古茶树坡
                "map-place-9a67d8c214aeb0c822ece6e2",                                       // 赫斯珀利德斯之馆
                "map-place-9b42481380b768831392ec8a",                                       // 天云峠
                "map-place-9b4fbd545ea9058467463938",                                       // 祖遗庙宇
                "map-place-9bfba5e46a688fdca21795cb",                                       // 古兽冰原
                "map-place-9c004ef78f869ea2b38a1c9f",                                       // 八酝岛
                "map-place-9c2d150ef9020bcf14610620",                                       // 苦壑崖
                "map-place-9ceec4dbc242f11659892ea1",                                       // 白露区
                "map-place-9d1fd63b81c2943f97c59d13",                                       // 欧庇克莱歌剧院
                "map-place-9f94512989f5bae85590b4ea",                                       // 知比山
                "map-place-a0f6976d276f7e61af83c1bf",                                       // 隆崛坡
                "map-place-a209a353662dc2fe096d2f28",                                       // 达达乌帕谷
                "map-place-a2a1667fc9ea4a589341e81e",                                       // 荼泥黑渊
                "map-place-a2e7af6314d6bf4b4b90abda",                                       // 叮铃哐啷蛋卷工坊
                "map-place-a3e867a82be2f27207902952",                                       // 神无冢
                "map-place-a77744bde3476c82eded5f71",                                       // 月矩力试验设计局
                "map-place-a793f332ec64bd016fb3542d",                                       // 禅那园
                "map-place-a8551da5ca0a28ca56673037",                                       // 白冕宫
                "map-place-a8d3e62f7cd0db7a77dc845e",                                       // 巨渊之口
                "map-place-a95362e8d9b58769f2eec471",                                       // 帕哈岛
                "map-place-a9aae36453b77a9a1a812236",                                       // 柔灯港
                "map-place-aae74682ab4838a3dd41f77c",                                       // 柴薪之丘
                "map-place-aaea0da4db778b2439b4c6bc",                                       // 望舒客栈
                "map-place-ab0bc48fc522a89b62e23aa5",                                       // 悲悼的圣所
                "map-place-ac8f84713490330cf0352c08",                                       // 坚岩隘谷
                "map-place-aca349373efe933809c26637",                                       // 湖中垂柳
                "map-place-ad0328aab4db7cb5be96b7a1",                                       // 望风角
                "map-place-adee5efc740d664475479907",                                       // 安瓦蒂尼尔湖
                "map-place-b1ccb621b53f27f0e3516da9",                                       // 银月之庭
                "map-place-b3deb096a2ddd3ab32b0ddcd",                                       // 化城郭
                "map-place-b49c313feaf1d8eeddf0439f",                                       // 神弃殿阁
                "map-place-b51d6fb8942775ee7ffe345b",                                       // 活力之家
                "map-place-b522c933b0064fd841c2565a",                                       // 彩彩崖
                "map-place-b6d7b3748af3b0c27d0d8535",                                       // 风息山
                "map-place-b6fc8d1d00b870e98751ccce",                                       // 芒索斯山东麓
                "map-place-b731aad1aa6a48da36246034",                                       // 蓝珀湖
                "map-place-b91713acc0ffab65ab3d8578",                                       // 愚妄行宫
                "map-place-bb087d7084e3ee325c3576be",                                       // 荒石苍漠
                "map-place-bbe54f022f2e69cc4c82b5d7",                                       // 铄石之丘
                "map-place-bc398969d1c2449852e43cd0",                                       // 镔铁沙丘
                "map-place-bdbd54467906fb51bdaa73b5",                                       // 望崖营壁
                "map-place-be3fb048c5bb01bc51b6a694",                                       // 虚海望
                "map-place-bf82891b0c80be4942188e9b",                                       // 茂知祭场
                "map-place-c03be3213f6725dff837d5ba",                                       // 噩影泽地
                "map-place-c085c8feb7d0d9468871cd69",                                       // 孑遗的留迹
                "map-place-c111142ac8e3e45fa2f89338",                                       // 摘星崖
                "map-place-c155e4b6f969c47e6b4733b5",                                       // 沐光之台
                "map-place-c189e504558a6c636891f034",                                       // 明冠山地
                "map-place-c29b8afe7cf552a28ca39a59",                                       // 风啸山坡
                "map-place-c2e19de4642fc7032c8a9883",                                       // 离岛
                "map-place-c354cacc5da1873c7c97c95d",                                       // 归离原
                "map-place-c485a6b94ba7f37606d69b5b",                                       // 镜璧山
                "map-place-c65c9c8ed95383a4a3865426",                                       // 誓言岬
                "map-place-c69e4beaeabd97419583799d",                                       // 汐歌洞窟
                "map-place-c6cfc0015c89a206530811f1",                                       // 赤璋城垣
                "map-place-c7034b547708973b175f9df1",                                       // 枫丹廷
                "map-place-c7202836c4798c83afa2f8e1",                                       // 离渡谷
                "map-place-c7391e14cada2ea40ce925bd",                                       // 锋刃林泽
                "map-place-c778428c753e184fbfab29c1",                                       // 佩特莉可镇
                "map-place-c7c0e1db61b33cdc933cedb6",                                       // 马斯克礁
                "map-place-c80987024917abbb599dd0c4",                                       // 翠玦坡
                "map-place-c83d58859035bd9aad5011bb",                                       // 杜南纳前进站
                "map-place-ca1097d12f23a93a6232ae75",                                       // 阻勒隘
                "map-place-ca18a761450565ac3f20d03a",                                       // 塔尼特露营地
                "map-place-cd64a9f4849b5bfd65c3693d",                                       // 谒圣山峡
                "map-place-cf13b6a3a58d80efae1da295",                                       // 天工峡
                "map-place-cfb08020599c5714883d64f4",                                       // 「五绿洲」的孑遗
                "map-place-d0287e9aa716244eb0aa9cea",                                       // 诺思托伊区
                "map-place-d07db3df0bf57440abf58b53",                                       // 浮罗囿
                "map-place-d0e00b8fc0733b7be3707ada",                                       // 水天丛林
                "map-place-d23d047e23e33bb2253815a1",                                       // 荆夫港
                "map-place-d54f0263d09e2316c76fada5",                                       // 苔骨荒原
                "map-place-d5e44f5d2e1a93c96aa4fcea",                                       // 青墟浦
                "map-place-d5fe8a185891c0396fd01a98",                                       // 彩石顶
                "map-place-d65ac34f34bff5560b0cecc0",                                       // 善见地
                "map-place-d8f8d0b89bf4bcd53d4af17f",                                       // 望泷村
                "map-place-d94f2f55df4c41372a66e061",                                       // 「沃陆之邦」
                "map-place-db92436783f0b666c9cf85a8",                                       // 幽林雾道
                "map-place-dc511c6e0277cda534a86b97",                                       // 焰羽谷
                "map-place-de2cfefddd9484ec1dae25db",                                       // 宝玦口
                "map-place-de46400f51890be089eb4fed",                                       // 赤王陵
                "map-place-dec3a8aa3d6f27348b6a1b88",                                       // 莫尔泰区
                "map-place-e004653140d71132c6b9c78f",                                       // 药蝶谷
                "map-place-e08fee50bac897d663c57c96",                                       // 达马山
                "map-place-e0e8f002291ceb4118edc706",                                       // 奥奇卡纳塔
                "map-place-e27d97f93030067c84b56d6c",                                       // 瑶光滩
                "map-place-e3a6083c88e093b45dd3ad95",                                       // 望风山地
                "map-place-e4378b4ec81117e5533a7b0f",                                       // 伊黎耶林区
                "map-place-e49233354d715ddca188d391",                                       // 采樵谷
                "map-place-e4f12b1913c2001c26cd3eb0",                                       // 厄里那斯
                "map-place-e7a0772d73f87359087534bd",                                       // 呼呼丘
                "map-place-ea48abe3b55d585c8a239dad",                                       // 卡萨扎莱宫
                "map-place-eb2ec54be3adff22a16aec2f",                                       // 镇守之森
                "map-place-ebd3396a5b7b78c9f73fca98",                                       // 奔狼领
                "map-place-ec6497515ff216a2da2ef4d9",                                       // 烟硌山峰
                "map-place-ed86c528fd1973d302caebc5",                                       // 中央实验室遗址
                "map-place-ef33131eedfec9643ee3c4e8",                                       // 霜殛寒峰
                "map-place-ef72398f81a1fda897f6c32b",                                       // 龙脊雪山
                "map-place-f1cc575d7486433109001038",                                       // 逢岳之野
                "map-place-f254414203d67642b1a430f5",                                       // 「三运河之地」
                "map-place-f2acadaf423b913e7e2a6961",                                       // 「悬木人」
                "map-place-f34c4c45e7e097484edb9ab1",                                       // 拜达港
                "map-place-f4270d0aff03a6da4cb1c29f",                                       // 皮拉米达城
                "map-place-f4fd40d6d36a71118a04906a",                                       // 遁玉陵
                "map-place-f50a896ae91d1c4f1ce266c1",                                       // 溶水域
                "map-place-f600e9e45b9e169aeda4bf4d",                                       // 「烟谜主」
                "map-place-f676333d350064e64292753a",                                       // 秘仪圣殿
                "map-place-f6d86909f67e4c1d05e3e4b5",                                       // 踏鞴砂
                "map-place-f7940a085a9bafcd14fad526",                                       // 雪葬之都·近郊
                "map-place-f7a4fd6a6d0f65f15a59d6ee",                                       // 苍风高地
                "map-place-f8ea30f29b04be959028e1bb",                                       // 千来神祠
                "map-place-f9ac0061de068bf638561e2d",                                       // 千风神殿
                "map-place-fa94095ce6a058a5c04e3590",                                       // 璃月港
                "map-place-faf484865fd3a418459bedd5",                                       // 厄布拉神柱
                "map-place-fc719d3dbee0f5e03b806b14",                                       // 地中之盐
                "map-place-fce1ce68d99fd3af5144995c",                                       // 霜月之坊
                "map-place-fcff3c2d490c903eb65df667",                                       // 海祇岛
                "map-place-fd41e0c1a24bc636ed743ff5",                                       // 安饶之野
                "map-place-ff002c94f13a8001a37f3edf",                                       // 万火之瓯
                "map-place-ff3ba56448c85d2b84829b0c",                                       // 杜南纳深坑
                // #endregion surfaceLabels
            ],
            "places": [
                // #region places:point 地图点位
                "point-3-1",                                                                // 北风之狼的庙宇
                "point-3-10",                                                               // 传送锚点
                "point-3-100",                                                              // 传送锚点
                "point-3-1002",                                                             // 传送锚点
                "point-3-1008",                                                             // 传送锚点
                "point-3-1009",                                                             // 夏诺蒂拉与揭示之书
                "point-3-1010",                                                             // 传送锚点
                "point-3-1011",                                                             // 传送锚点
                "point-3-1012",                                                             // 传送锚点
                "point-3-1013",                                                             // 传送锚点
                "point-3-1014",                                                             // 传送锚点
                "point-3-1015",                                                             // 传送锚点
                "point-3-1016",                                                             // 传送锚点
                "point-3-1021",                                                             // 传送锚点
                "point-3-1022",                                                             // 传送锚点
                "point-3-1028",                                                             // 传送锚点
                "point-3-1029",                                                             // 传送锚点
                "point-3-103",                                                              // 传送锚点
                "point-3-1030",                                                             // 传送锚点
                "point-3-1031",                                                             // 传送锚点
                "point-3-1032",                                                             // 传送锚点
                "point-3-1036",                                                             // 《蒸汽鸟报》主编
                "point-3-1037",                                                             // 炼金
                "point-3-1038",                                                             // 冒险家协会
                "point-3-1039",                                                             // 白棠珍奇屋
                "point-3-104",                                                              // 传送锚点
                "point-3-1041",                                                             // 博蒙特工坊
                "point-3-1042",                                                             // 枫丹钓鱼协会
                "point-3-1045",                                                             // 传送锚点
                "point-3-1047",                                                             // 露泽咖啡厅
                "point-3-105",                                                              // 传送锚点
                "point-3-1056",                                                             // 「公爵」办公室
                // "point-3-1058",                                                             // 未提供名称
                "point-3-1059",                                                             // 福利餐
                "point-3-1060",                                                             // 「破烂骨头商店」
                // "point-3-1061",                                                             // 未提供名称
                "point-3-1062",                                                             // 传送锚点
                "point-3-1063",                                                             // 传送锚点
                "point-3-1064",                                                             // 传送锚点
                "point-3-1065",                                                             // 传送锚点
                "point-3-107",                                                              // 无妄引咎密宫
                "point-3-1070",                                                             // 传送锚点
                "point-3-1071",                                                             // 传送锚点
                "point-3-1072",                                                             // 传送锚点
                "point-3-1081",                                                             // 传送锚点
                "point-3-1084",                                                             // 传送锚点
                "point-3-1085",                                                             // 异界余影
                "point-3-1087",                                                             // 传送锚点
                "point-3-1095",                                                             // 传送锚点
                "point-3-11",                                                               // 传送锚点
                "point-3-1104",                                                             // 传送锚点
                "point-3-1105",                                                             // 传送锚点
                "point-3-1113",                                                             // 揭示之书
                "point-3-1114",                                                             // 格式塔的探索
                "point-3-1115",                                                             // 格式塔的探索
                "point-3-1116",                                                             // 格式塔的探索
                "point-3-1117",                                                             // 格式塔的探索
                "point-3-1118",                                                             // 格式塔的探索
                "point-3-1119",                                                             // 格式塔的探索
                "point-3-1120",                                                             // 格式塔的探索
                "point-3-1121",                                                             // 七天神像-水
                "point-3-1122",                                                             // 传送锚点
                "point-3-1125",                                                             // 传送锚点
                "point-3-1126",                                                             // 传送锚点
                "point-3-1127",                                                             // 传送锚点
                "point-3-1128",                                                             // 传送锚点
                "point-3-1129",                                                             // 传送锚点
                "point-3-1130",                                                             // 传送锚点
                "point-3-1136",                                                             // 传送锚点
                "point-3-114",                                                              // 传送锚点
                "point-3-1142",                                                             // 临瀑之城
                "point-3-1144",                                                             // 传送锚点
                "point-3-1148",                                                             // 传送锚点
                "point-3-1149",                                                             // 锦落庭·祀珑
                "point-3-1151",                                                             // 褪色的剧场
                "point-3-1155",                                                             // 传送锚点
                "point-3-1158",                                                             // 传送锚点
                "point-3-116",                                                              // 传送锚点
                // "point-3-1160",                                                             // 未提供名称
                "point-3-1166",                                                             // 七天神像-火
                "point-3-1167",                                                             // 七天神像-火
                "point-3-1168",                                                             // 七天神像-火
                "point-3-1169",                                                             // 七天神像-火
                "point-3-117",                                                              // 华清归藏密宫
                "point-3-1170",                                                             // 传送锚点
                "point-3-1172",                                                             // 传送锚点
                "point-3-1173",                                                             // 传送锚点
                "point-3-1174",                                                             // 传送锚点
                "point-3-1175",                                                             // 传送锚点
                "point-3-1176",                                                             // 传送锚点
                "point-3-1177",                                                             // 传送锚点
                "point-3-1178",                                                             // 传送锚点
                "point-3-1179",                                                             // 传送锚点
                "point-3-1181",                                                             // 传送锚点
                "point-3-1182",                                                             // 传送锚点
                "point-3-1183",                                                             // 传送锚点
                "point-3-1184",                                                             // 传送锚点
                "point-3-1185",                                                             // 传送锚点
                "point-3-1186",                                                             // 蕴火的幽墟
                "point-3-1188",                                                             // 深古瞭望所
                "point-3-1190",                                                             // 虹灵的净土
                "point-3-12",                                                               // 传送锚点
                "point-3-1200",                                                             // 传送锚点
                "point-3-1201",                                                             // 传送锚点
                "point-3-1204",                                                             // 七天神像-岩
                "point-3-1205",                                                             // 春茗茶坊
                "point-3-1206",                                                             // 传送锚点
                "point-3-121",                                                              // 传送锚点
                "point-3-1218",                                                             // 秘境入口
                "point-3-1219",                                                             // 传送锚点
                "point-3-122",                                                              // 传送锚点
                "point-3-1220",                                                             // 传送锚点
                "point-3-1227",                                                             // 传送锚点
                "point-3-1228",                                                             // 传送锚点
                "point-3-1232",                                                             // 七天神像-火
                "point-3-1233",                                                             // 七天神像-火
                "point-3-1234",                                                             // 缄默之殿
                "point-3-1237",                                                             // 传送锚点
                "point-3-1238",                                                             // 传送锚点
                "point-3-1239",                                                             // 传送锚点
                "point-3-1240",                                                             // 传送锚点
                "point-3-1241",                                                             // 零落丘墟
                "point-3-1243",                                                             // 传送锚点
                "point-3-1244",                                                             // 传送锚点
                "point-3-1245",                                                             // 传送锚点
                "point-3-1246",                                                             // 传送锚点
                "point-3-1249",                                                             // 传送锚点
                "point-3-1250",                                                             // 传送锚点
                "point-3-1251",                                                             // 传送锚点
                "point-3-1252",                                                             // 传送锚点
                "point-3-1253",                                                             // 传送锚点
                "point-3-1254",                                                             // 传送锚点
                "point-3-1268",                                                             // 传送锚点
                "point-3-1269",                                                             // 传送锚点
                "point-3-127",                                                              // 传送锚点
                "point-3-1270",                                                             // 传送锚点
                "point-3-1271",                                                             // 传送锚点
                "point-3-1272",                                                             // 传送锚点
                "point-3-1273",                                                             // 传送锚点
                "point-3-1274",                                                             // 传送锚点
                "point-3-128",                                                              // 传送锚点
                "point-3-1284",                                                             // 传送锚点
                "point-3-1295",                                                             // 倦意之屋
                "point-3-1297",                                                             // 传送锚点
                "point-3-1298",                                                             // 传送锚点
                "point-3-1299",                                                             // 传送锚点
                "point-3-13",                                                               // 传送锚点
                "point-3-1300",                                                             // 传送锚点
                "point-3-1301",                                                             // 传送锚点
                "point-3-1302",                                                             // 传送锚点
                "point-3-1303",                                                             // 传送锚点
                "point-3-1304",                                                             // 传送锚点
                "point-3-1305",                                                             // 传送锚点
                "point-3-1306",                                                             // 传送锚点
                "point-3-131",                                                              // 太山府
                "point-3-1314",                                                             // 传送锚点
                "point-3-1316",                                                             // 传送锚点
                "point-3-1317",                                                             // 「话事处」
                "point-3-1318",                                                             // 传送锚点
                "point-3-1319",                                                             // 传送锚点
                "point-3-1320",                                                             // 传送锚点
                "point-3-1324",                                                             // 传送锚点
                "point-3-1325",                                                             // 传送锚点
                "point-3-1327",                                                             // 传送锚点
                "point-3-1329",                                                             // 传送锚点
                "point-3-133",                                                              // 墟散人离之处
                "point-3-1332",                                                             // 传送锚点
                "point-3-1333",                                                             // 传送锚点
                "point-3-1334",                                                             // 传送锚点
                "point-3-1336",                                                             // 传送锚点
                "point-3-1337",                                                             // 传送锚点
                "point-3-1340",                                                             // 海露港港口
                "point-3-1341",                                                             // 传送锚点
                "point-3-1345",                                                             // 歇息处的入口
                "point-3-1349",                                                             // 传送锚点
                "point-3-135",                                                              // 震雷连山密宫
                "point-3-1350",                                                             // 传送锚点
                // "point-3-1352",                                                             // 未提供名称
                // "point-3-1353",                                                             // 未提供名称
                // "point-3-1354",                                                             // 未提供名称
                "point-3-1359",                                                             // 七天神像-火
                "point-3-1363",                                                             // 传送锚点
                "point-3-1368",                                                             // 传送锚点
                "point-3-137",                                                              // 孤云凌霄之处
                "point-3-1371",                                                             // 传送锚点
                "point-3-1372",                                                             // 传送锚点
                "point-3-1373",                                                             // 传送锚点
                "point-3-1374",                                                             // 传送锚点
                "point-3-1376",                                                             // 七天神像-火
                "point-3-1377",                                                             // 神庙·煅石之轮
                "point-3-1381",                                                             // 冒险家协会
                "point-3-1382",                                                             // 「龙遗物研究协会」
                "point-3-1384",                                                             // 炼金
                "point-3-1385",                                                             // 皈礼熔炉
                "point-3-1386",                                                             // 扎坎小吃摊
                "point-3-139",                                                              // 华池岩岫
                "point-3-1392",                                                             // 传送锚点
                "point-3-1394",                                                             // 传送锚点
                "point-3-1395",                                                             // 传送锚点
                "point-3-1396",                                                             // 传送锚点
                "point-3-14",                                                               // 传送锚点
                "point-3-1405",                                                             // 传送锚点
                "point-3-1407",                                                             // 传送锚点
                "point-3-1408",                                                             // 传送锚点
                "point-3-1417",                                                             // 传送锚点
                "point-3-1418",                                                             // 传送锚点
                "point-3-1419",                                                             // 传送锚点
                "point-3-1421",                                                             // 传送锚点
                "point-3-1422",                                                             // 传送锚点
                // "point-3-1424",                                                             // 未提供名称
                // "point-3-1425",                                                             // 未提供名称
                "point-3-1427",                                                             // 传送锚点
                "point-3-1428",                                                             // 传送锚点
                "point-3-1429",                                                             // 七天神像-火
                "point-3-1432",                                                             // 传送锚点
                "point-3-1437",                                                             // 传送锚点
                "point-3-1438",                                                             // 传送锚点
                "point-3-1439",                                                             // 传送锚点
                "point-3-1440",                                                             // 传送锚点
                "point-3-1448",                                                             // 传送锚点
                "point-3-1449",                                                             // 传送锚点
                "point-3-1452",                                                             // 千音雅集·乐器试用
                "point-3-146",                                                              // 曲径通幽之处
                "point-3-1464",                                                             // 纳塔钓鱼协会
                "point-3-1465",                                                             // 传送锚点
                "point-3-1466",                                                             // 悬浮小屋
                "point-3-1467",                                                             // 悬浮小屋
                "point-3-1468",                                                             // 悬浮小屋
                "point-3-1469",                                                             // 马尼菲科的摄影点位
                "point-3-1470",                                                             // 马尼菲科的摄影点位
                "point-3-1471",                                                             // 马尼菲科的摄影点位
                "point-3-1473",                                                             // 荒废砌造坞
                "point-3-1476",                                                             // 天蛇船
                "point-3-1477",                                                             // 传送锚点
                "point-3-1478",                                                             // 北部营地
                "point-3-1479",                                                             // 传送锚点
                "point-3-1480",                                                             // 传送锚点
                "point-3-1482",                                                             // 秋沙钱汤
                "point-3-1488",                                                             // 碑碣的记录
                "point-3-1490",                                                             // 传送锚点
                "point-3-15",                                                               // 传送锚点
                "point-3-151",                                                              // 海灯节
                "point-3-1511",                                                             // 金贝乐棚
                "point-3-1512",                                                             // 源火之圣座
                "point-3-1515",                                                             // 新月神像
                "point-3-1516",                                                             // 新月神像
                "point-3-1517",                                                             // 新月神像
                "point-3-1518",                                                             // 传送锚点
                // "point-3-1519",                                                             // 未提供名称
                "point-3-152",                                                              // 传送锚点
                "point-3-1526",                                                             // 传送锚点
                // "point-3-1529",                                                             // 未提供名称
                "point-3-153",                                                              // 传送锚点
                "point-3-1535",                                                             // 传送锚点
                "point-3-154",                                                              // 传送锚点
                "point-3-1542",                                                             // 传送锚点
                "point-3-1545",                                                             // 传送锚点
                "point-3-1546",                                                             // 传送锚点
                "point-3-1547",                                                             // 传送锚点
                "point-3-1548",                                                             // 传送锚点
                "point-3-1549",                                                             // 传送锚点
                "point-3-155",                                                              // 传送锚点
                "point-3-1555",                                                             // 传送锚点
                "point-3-1556",                                                             // 传送锚点
                "point-3-1557",                                                             // 传送锚点
                "point-3-1558",                                                             // 传送锚点
                "point-3-1559",                                                             // 传送锚点
                "point-3-156",                                                              // 传送锚点
                "point-3-1560",                                                             // 传送锚点
                "point-3-1561",                                                             // 传送锚点
                "point-3-1562",                                                             // 传送锚点
                "point-3-1563",                                                             // 传送锚点
                "point-3-1565",                                                             // 传送锚点
                "point-3-1568",                                                             // 传送锚点
                "point-3-157",                                                              // 铁匠铺
                "point-3-1571",                                                             // 传送锚点
                "point-3-1572",                                                             // 传送锚点
                "point-3-1576",                                                             // 待解「弈局」
                "point-3-1578",                                                             // 传送锚点
                "point-3-1579",                                                             // 传送锚点
                "point-3-158",                                                              // 冒险家协会
                "point-3-1580",                                                             // 传送锚点
                "point-3-1581",                                                             // 传送锚点
                "point-3-1582",                                                             // 传送锚点
                "point-3-1583",                                                             // 传送锚点
                "point-3-1584",                                                             // 传送锚点
                "point-3-1585",                                                             // 传送锚点
                "point-3-1586",                                                             // 传送锚点
                "point-3-1587",                                                             // 传送锚点
                "point-3-1588",                                                             // 传送锚点
                "point-3-1589",                                                             // 传送锚点
                "point-3-159",                                                              // 万民堂
                "point-3-1590",                                                             // 传送锚点
                "point-3-1592",                                                             // 传送锚点
                "point-3-1593",                                                             // 传送锚点
                "point-3-1594",                                                             // 传送锚点
                "point-3-1595",                                                             // 传送锚点
                "point-3-1596",                                                             // 传送锚点
                "point-3-1597",                                                             // 传送锚点
                "point-3-1598",                                                             // 传送锚点
                "point-3-1600",                                                             // 传送锚点
                "point-3-1602",                                                             // 传送锚点
                "point-3-1603",                                                             // 传送锚点
                "point-3-1604",                                                             // 传送锚点
                "point-3-1605",                                                             // 传送锚点
                "point-3-1606",                                                             // 传送锚点
                "point-3-1607",                                                             // 传送锚点
                "point-3-1609",                                                             // 传送锚点
                "point-3-161",                                                              // 明星斋
                "point-3-1610",                                                             // 传送锚点
                "point-3-1611",                                                             // 传送锚点
                "point-3-1613",                                                             // 新月神像
                "point-3-1614",                                                             // 新月神像
                "point-3-1615",                                                             // 新月神像
                "point-3-162",                                                              // 传送锚点
                "point-3-1628",                                                             // 「幽境危战」
                // "point-3-1630",                                                             // 进入
                "point-3-1643",                                                             // 传送锚点
                "point-3-1644",                                                             // 传送锚点
                "point-3-1645",                                                             // 传送锚点
                "point-3-1646",                                                             // 传送锚点
                "point-3-1647",                                                             // 传送锚点
                "point-3-1649",                                                             // 传送锚点
                "point-3-165",                                                              // 传送锚点
                "point-3-1650",                                                             // 传送锚点
                // "point-3-1651",                                                             // 未提供名称
                // "point-3-1652",                                                             // 未提供名称
                // "point-3-1653",                                                             // 未提供名称
                // "point-3-1654",                                                             // 未提供名称
                "point-3-166",                                                              // 传送锚点
                "point-3-1665",                                                             // 传送锚点
                "point-3-1666",                                                             // 传送锚点
                "point-3-1667",                                                             // 传送锚点
                "point-3-1668",                                                             // 传送锚点
                "point-3-1669",                                                             // 传送锚点
                "point-3-167",                                                              // 传送锚点
                "point-3-1670",                                                             // 传送锚点
                "point-3-1671",                                                             // 传送锚点
                "point-3-1672",                                                             // 传送锚点
                "point-3-1673",                                                             // 传送锚点
                "point-3-1674",                                                             // 传送锚点
                "point-3-1675",                                                             // 传送锚点
                "point-3-1676",                                                             // 传送锚点
                "point-3-1677",                                                             // 传送锚点
                "point-3-1678",                                                             // 传送锚点
                "point-3-1679",                                                             // 传送锚点
                "point-3-168",                                                              // 传送锚点
                "point-3-1680",                                                             // 传送锚点
                "point-3-1681",                                                             // 传送锚点
                "point-3-1682",                                                             // 传送锚点
                "point-3-1684",                                                             // 冒险家协会
                "point-3-1687",                                                             // 炼金
                "point-3-1690",                                                             // 无光的深都
                "point-3-1692",                                                             // 霜凝的机枢
                "point-3-1694",                                                             // 失落的月庭
                "point-3-1698",                                                             // 传送锚点
                "point-3-170",                                                              // 炼金
                "point-3-1707",                                                             // 传送锚点
                "point-3-1712",                                                             // 传送锚点
                // "point-3-1713",                                                             // 秘境入口
                "point-3-1719",                                                             // 传送锚点
                // "point-3-1721",                                                             // 秘境入口
                "point-3-1724",                                                             // 传送锚点
                "point-3-1725",                                                             // 传送锚点
                "point-3-1726",                                                             // 传送锚点
                "point-3-1727",                                                             // 传送锚点
                "point-3-1728",                                                             // 传送锚点
                "point-3-1729",                                                             // 传送锚点
                "point-3-1730",                                                             // 传送锚点
                "point-3-1731",                                                             // 传送锚点
                "point-3-1732",                                                             // 传送锚点
                "point-3-1733",                                                             // 传送锚点
                "point-3-1734",                                                             // 传送锚点
                "point-3-1735",                                                             // 传送锚点
                "point-3-1736",                                                             // 传送锚点
                "point-3-1742",                                                             // 传送锚点
                "point-3-1752",                                                             // 新月神像
                "point-3-1757",                                                             // 七天神像-冰
                "point-3-1758",                                                             // 七天神像-冰
                "point-3-1759",                                                             // 七天神像-冰
                "point-3-1760",                                                             // 七天神像-冰
                "point-3-1761",                                                             // 七天神像-冰
                // "point-3-1766",                                                             // 秘境入口
                "point-3-1770",                                                             // 传送锚点
                "point-3-1771",                                                             // 传送锚点
                "point-3-1772",                                                             // 传送锚点
                "point-3-1785",                                                             // 传送锚点
                // "point-3-1788",                                                             // 调查虚影
                // "point-3-1797",                                                             // 秘境入口
                // "point-3-1798",                                                             // 秘境入口
                "point-3-180",                                                              // 传送锚点
                "point-3-1803",                                                             // 传送锚点
                // "point-3-1804",                                                             // 返回剧情
                // "point-3-1806",                                                             // 前往月球
                // "point-3-1809",                                                             // 秘境入口
                "point-3-181",                                                              // 传送锚点
                "point-3-1811",                                                             // 月童的库藏
                "point-3-182",                                                              // 七天神像-岩
                // "point-3-1820",                                                             // 隐月之息
                // "point-3-1822",                                                             // 隐月之息
                // "point-3-1827",                                                             // 进入研究所
                "point-3-1829",                                                             // 传送锚点
                "point-3-1830",                                                             // 传送锚点
                "point-3-1831",                                                             // 传送锚点
                "point-3-1833",                                                             // 传送锚点
                "point-3-1834",                                                             // 传送锚点
                "point-3-1835",                                                             // 传送锚点
                "point-3-1842",                                                             // 传送锚点
                "point-3-1865",                                                             // 传送锚点
                "point-3-1866",                                                             // 传送锚点
                "point-3-1873",                                                             // 传送锚点
                "point-3-1884",                                                             // 传送锚点
                "point-3-1885",                                                             // 七天神像-风
                "point-3-1886",                                                             // 传送锚点
                "point-3-1914",                                                             // 传送锚点
                "point-3-1915",                                                             // 传送锚点
                "point-3-1916",                                                             // 传送锚点
                "point-3-1917",                                                             // 传送锚点
                "point-3-1918",                                                             // 传送锚点
                "point-3-1919",                                                             // 赝月的研究所
                "point-3-1922",                                                             // 传送锚点
                "point-3-1923",                                                             // 传送锚点
                "point-3-1924",                                                             // 传送锚点
                "point-3-1925",                                                             // 传送锚点
                "point-3-1927",                                                             // 传送锚点
                "point-3-1930",                                                             // 传送锚点
                "point-3-1931",                                                             // 传送锚点
                "point-3-1932",                                                             // 传送锚点
                "point-3-1933",                                                             // 传送锚点
                "point-3-1934",                                                             // 传送锚点
                "point-3-1939",                                                             // 传送锚点
                "point-3-1953",                                                             // 传送锚点
                "point-3-1954",                                                             // 传送锚点
                "point-3-1956",                                                             // 传送锚点
                "point-3-1957",                                                             // 传送锚点
                "point-3-1959",                                                             // 传送锚点
                "point-3-1960",                                                             // 传送锚点
                "point-3-1963",                                                             // 传送锚点
                "point-3-1969",                                                             // 传送锚点
                "point-3-197",                                                              // 传送锚点
                "point-3-1970",                                                             // 传送锚点
                "point-3-1997",                                                             // 传送锚点
                // "point-3-1998",                                                             // 进入房间
                "point-3-20",                                                               // 西风之鹰的庙宇
                "point-3-200",                                                              // 传送锚点
                "point-3-2003",                                                             // 山风的荆冕
                "point-3-2004",                                                             // 传送锚点
                "point-3-2009",                                                             // 传送锚点
                "point-3-201",                                                              // 炼金
                "point-3-2014",                                                             // 传送锚点
                "point-3-2015",                                                             // 传送锚点
                // "point-3-2025",                                                             // 返回特殊剧情模式
                // "point-3-2027",                                                             // 返回特殊剧情模式
                // "point-3-2029",                                                             // 返回特殊剧情模式
                "point-3-2033",                                                             // 传送锚点
                "point-3-2034",                                                             // 传送锚点
                "point-3-204",                                                              // 七天神像-风
                "point-3-205",                                                              // 传送锚点
                "point-3-2051",                                                             // 传送锚点
                "point-3-2052",                                                             // 传送锚点
                "point-3-2053",                                                             // 万有涅槃缚境
                "point-3-206",                                                              // 传送锚点
                "point-3-2064",                                                             // 传送锚点
                "point-3-207",                                                              // 「西风骑士团」后勤
                "point-3-2071",                                                             // 传送锚点
                "point-3-2074",                                                             // 荒坠的圣迹
                "point-3-2075",                                                             // 逆悬的冰河
                "point-3-208",                                                              // 传送锚点
                "point-3-2080",                                                             // 传送锚点
                "point-3-2081",                                                             // 传送锚点
                "point-3-209",                                                              // 传送锚点
                "point-3-210",                                                              // 传送锚点
                "point-3-2106",                                                             // 妄念的创痕
                "point-3-211",                                                              // 传送锚点
                // "point-3-2112",                                                             // 秘境入口
                "point-3-212",                                                              // 传送锚点
                "point-3-2121",                                                             // 传送锚点
                "point-3-2122",                                                             // 传送锚点
                "point-3-2123",                                                             // 传送锚点
                // "point-3-2124",                                                             // 开始驱除邪祟
                // "point-3-2126",                                                             // 驱使藤人
                "point-3-2128",                                                             // 传送锚点
                "point-3-213",                                                              // 传送锚点
                "point-3-2130",                                                             // 传送锚点
                "point-3-2134",                                                             // 传送锚点
                "point-3-2135",                                                             // 传送锚点
                "point-3-2136",                                                             // 传送锚点
                "point-3-2137",                                                             // 传送锚点
                "point-3-2138",                                                             // 传送锚点
                "point-3-2139",                                                             // 传送锚点
                "point-3-214",                                                              // 传送锚点
                "point-3-2140",                                                             // 传送锚点
                "point-3-2141",                                                             // 传送锚点
                "point-3-2144",                                                             // 传送锚点
                "point-3-2145",                                                             // 传送锚点
                "point-3-2146",                                                             // 传送锚点
                "point-3-2147",                                                             // 传送锚点
                "point-3-2148",                                                             // 传送锚点
                "point-3-215",                                                              // 「璃月总务司」干事
                "point-3-2150",                                                             // 传送锚点
                "point-3-2152",                                                             // 传送锚点
                "point-3-2155",                                                             // 传送锚点
                // "point-3-2159",                                                             // 秘境入口
                "point-3-216",                                                              // 莫娜
                "point-3-2164",                                                             // 传送锚点
                // "point-3-2165",                                                             // 返回剧情
                "point-3-2168",                                                             // 冒险家协会
                "point-3-2174",                                                             // 传送锚点
                "point-3-218",                                                              // 进入「黄金屋」
                "point-3-2185",                                                             // 传送锚点
                "point-3-2186",                                                             // 传送锚点
                "point-3-2187",                                                             // 传送锚点
                // "point-3-2188",                                                             // 开始施术
                // "point-3-2189",                                                             // 开始施术
                // "point-3-2190",                                                             // 开始施术
                // "point-3-2195",                                                             // 秘境入口
                "point-3-2198",                                                             // 传送锚点
                "point-3-22",                                                               // 南风之狮的庙宇
                "point-3-2204",                                                             // 传送锚点
                "point-3-2205",                                                             // 传送锚点
                "point-3-221",                                                              // 芬德尼尔之顶
                "point-3-2219",                                                             // 传送锚点
                "point-3-222",                                                              // 传送锚点
                "point-3-2220",                                                             // 传送锚点
                "point-3-2225",                                                             // 传送锚点
                "point-3-2228",                                                             // 传送锚点
                "point-3-225",                                                              // 传送锚点
                "point-3-226",                                                              // 忍冬之树
                "point-3-2262",                                                             // 传送锚点
                // "point-3-227",                                                              // 未提供名称
                "point-3-228",                                                              // 传送锚点
                "point-3-231",                                                              // 恨繁囿兮作土…
                "point-3-234",                                                              // 七天神像-雷
                "point-3-235",                                                              // 七天神像-雷
                "point-3-236",                                                              // 七天神像-雷
                // "point-3-238",                                                              // 未提供名称
                "point-3-241",                                                              // 传送锚点
                "point-3-242",                                                              // 传送锚点
                "point-3-244",                                                              // 传送锚点
                "point-3-245",                                                              // 传送锚点
                "point-3-246",                                                              // 传送锚点
                "point-3-247",                                                              // 传送锚点
                "point-3-248",                                                              // 传送锚点
                "point-3-249",                                                              // 传送锚点
                "point-3-250",                                                              // 传送锚点
                "point-3-251",                                                              // 传送锚点
                "point-3-252",                                                              // 传送锚点
                "point-3-253",                                                              // 传送锚点
                "point-3-254",                                                              // 传送锚点
                "point-3-255",                                                              // 传送锚点
                "point-3-256",                                                              // 传送锚点
                "point-3-257",                                                              // 传送锚点
                "point-3-258",                                                              // 传送锚点
                "point-3-259",                                                              // 「机关棋谭·代理人」驹形
                "point-3-268",                                                              // 风花节
                "point-3-271",                                                              // 「伏龙树」之底
                "point-3-282",                                                              // 山脊守望
                "point-3-286",                                                              // 「导能原盘」胡塞尼
                "point-3-29",                                                               // 七天神像-风
                "point-3-293",                                                              // 七天神像-雷
                "point-3-296",                                                              // 传送锚点
                "point-3-298",                                                              // 传送锚点
                "point-3-3",                                                                // 七天神像-风
                "point-3-301",                                                              // 传送锚点
                "point-3-302",                                                              // 传送锚点
                "point-3-304",                                                              // 传送锚点
                "point-3-305",                                                              // 传送锚点
                "point-3-306",                                                              // 传送锚点
                "point-3-307",                                                              // 传送锚点
                "point-3-308",                                                              // 借景之馆
                "point-3-310",                                                              // 菫色之庭
                "point-3-316",                                                              // 七天神像-雷
                "point-3-318",                                                              // 七天神像-雷
                "point-3-319",                                                              // 传送锚点
                "point-3-320",                                                              // 传送锚点
                "point-3-321",                                                              // 传送锚点
                "point-3-322",                                                              // 传送锚点
                "point-3-324",                                                              // 传送锚点
                "point-3-325",                                                              // 传送锚点
                "point-3-326",                                                              // 传送锚点
                "point-3-327",                                                              // 传送锚点
                "point-3-328",                                                              // 传送锚点
                "point-3-329",                                                              // 传送锚点
                "point-3-33",                                                               // 传送锚点
                "point-3-330",                                                              // 传送锚点
                "point-3-331",                                                              // 传送锚点
                "point-3-332",                                                              // 传送锚点
                "point-3-34",                                                               // 传送锚点
                "point-3-341",                                                              // 鸣神大社·神樱
                "point-3-342",                                                              // 炼金
                "point-3-343",                                                              // 「社奉行」吏僚
                "point-3-344",                                                              // 「机关棋谭·代理人」驹形
                "point-3-35",                                                               // 传送锚点
                "point-3-350",                                                              // 千门虚舟
                "point-3-351",                                                              // 池中宅邸
                "point-3-354",                                                              // 筑机战阵
                "point-3-359",                                                              // 阵代屋敷
                "point-3-36",                                                               // 传送锚点
                "point-3-361",                                                              // 椛染之庭
                "point-3-365",                                                              // 传送锚点
                "point-3-366",                                                              // 传送锚点
                "point-3-368",                                                              // 砂流之庭
                "point-3-37",                                                               // 传送锚点
                "point-3-370",                                                              // 神里屋敷
                "point-3-371",                                                              // 天目锻冶屋
                "point-3-372",                                                              // 志村屋
                "point-3-373",                                                              // 冒险家协会
                "point-3-374",                                                              // 根付之源
                "point-3-375",                                                              // 木漏茶室
                "point-3-38",                                                               // 深入风龙废墟
                "point-3-380",                                                              // 传送锚点
                "point-3-381",                                                              // 传送锚点
                "point-3-382",                                                              // 传送锚点
                "point-3-383",                                                              // 传送锚点
                "point-3-384",                                                              // 传送锚点
                "point-3-388",                                                              // 琳阳
                "point-3-391",                                                              // 蒙德钓鱼协会
                "point-3-396",                                                              // 鸣神岛·天守
                "point-3-4",                                                                // 七天神像-风
                "point-3-40",                                                               // 鹰之门
                "point-3-400",                                                              // 璃月钓鱼协会
                "point-3-401",                                                              // 稻妻钓鱼协会
                "point-3-408",                                                              // 「梦里生花」·咲耶
                // "point-3-409",                                                              // 未提供名称
                // "point-3-410",                                                              // 未提供名称
                // "point-3-411",                                                              // 未提供名称
                // "point-3-412",                                                              // 未提供名称
                // "point-3-413",                                                              // 未提供名称
                // "point-3-414",                                                              // 未提供名称
                // "point-3-415",                                                              // 未提供名称
                "point-3-42",                                                               // 铭记之谷
                "point-3-424",                                                              // 茂知之壳
                "point-3-428",                                                              // 「导能原盘」胡塞尼
                "point-3-429",                                                              // 「设计师」若紫
                "point-3-432",                                                              // 传送锚点
                "point-3-433",                                                              // 沉眠之庭
                "point-3-434",                                                              // 「玩具摊」
                "point-3-435",                                                              // 传送锚点
                "point-3-438",                                                              // 传送锚点
                "point-3-439",                                                              // 南十字·死兆星
                "point-3-44",                                                               // 忘却之峡
                "point-3-442",                                                              // 七天神像-岩
                "point-3-443",                                                              // 传送锚点
                "point-3-444",                                                              // 传送锚点
                "point-3-445",                                                              // 传送锚点
                "point-3-446",                                                              // 传送锚点
                "point-3-45",                                                               // 深境螺旋
                "point-3-462",                                                              // 七天神像-草
                "point-3-463",                                                              // 七天神像-草
                "point-3-464",                                                              // 七天神像-草
                "point-3-465",                                                              // 七天神像-草
                "point-3-467",                                                              // 灯中妙影
                "point-3-468",                                                              // 群玉阁
                "point-3-471",                                                              // 七天神像-草
                "point-3-472",                                                              // 七天神像-草
                "point-3-48",                                                               // 仲夏庭园
                "point-3-480",                                                              // 传送锚点
                "point-3-481",                                                              // 传送锚点
                "point-3-482",                                                              // 传送锚点
                "point-3-483",                                                              // 传送锚点
                "point-3-484",                                                              // 传送锚点
                "point-3-485",                                                              // 传送锚点
                "point-3-486",                                                              // 传送锚点
                "point-3-487",                                                              // 传送锚点
                "point-3-488",                                                              // 传送锚点
                "point-3-489",                                                              // 传送锚点
                "point-3-490",                                                              // 传送锚点
                "point-3-491",                                                              // 传送锚点
                "point-3-492",                                                              // 传送锚点
                "point-3-493",                                                              // 传送锚点
                "point-3-494",                                                              // 传送锚点
                "point-3-495",                                                              // 传送锚点
                "point-3-496",                                                              // 传送锚点
                "point-3-497",                                                              // 传送锚点
                "point-3-498",                                                              // 传送锚点
                "point-3-499",                                                              // 传送锚点
                "point-3-5",                                                                // 传送锚点
                "point-3-50",                                                               // 塞西莉亚苗圃
                "point-3-500",                                                              // 传送锚点
                "point-3-501",                                                              // 传送锚点
                "point-3-502",                                                              // 传送锚点
                "point-3-503",                                                              // 梦想乐土之殁
                "point-3-505",                                                              // 昏识塔
                "point-3-507",                                                              // 缘觉塔
                "point-3-509",                                                              // 有顶塔
                // "point-3-511",                                                              // 未提供名称
                "point-3-516",                                                              // 岩中幽谷
                "point-3-517",                                                              // 传送锚点
                "point-3-518",                                                              // 传送锚点
                "point-3-519",                                                              // 传送锚点
                "point-3-523",                                                              // 「教令院」联络官
                "point-3-524",                                                              // 兰巴德酒馆
                "point-3-525",                                                              // 冒险家协会
                "point-3-526",                                                              // 炼金
                "point-3-527",                                                              // 梅娜卡里商铺
                "point-3-528",                                                              // 须弥钓鱼协会
                "point-3-529",                                                              // 铁匠铺
                "point-3-530",                                                              // 净善宫
                "point-3-531",                                                              // 普斯帕咖啡馆
                "point-3-532",                                                              // 智慧宫
                "point-3-534",                                                              // 七天神像-草
                "point-3-535",                                                              // 七天神像-草
                "point-3-536",                                                              // 七天神像-草
                "point-3-537",                                                              // 传送锚点
                "point-3-538",                                                              // 传送锚点
                "point-3-539",                                                              // 传送锚点
                "point-3-54",                                                               // 西风骑士团
                "point-3-540",                                                              // 传送锚点
                "point-3-541",                                                              // 传送锚点
                "point-3-542",                                                              // 传送锚点
                "point-3-543",                                                              // 传送锚点
                "point-3-544",                                                              // 传送锚点
                "point-3-545",                                                              // 传送锚点
                "point-3-546",                                                              // 传送锚点
                "point-3-547",                                                              // 传送锚点
                "point-3-548",                                                              // 传送锚点
                "point-3-549",                                                              // 传送锚点
                "point-3-55",                                                               // 西风大教堂
                "point-3-550",                                                              // 传送锚点
                "point-3-551",                                                              // 传送锚点
                "point-3-552",                                                              // 传送锚点
                "point-3-553",                                                              // 传送锚点
                "point-3-555",                                                              // 传送锚点
                "point-3-557",                                                              // 传送锚点
                "point-3-558",                                                              // 传送锚点
                "point-3-56",                                                               // 天使的馈赠
                // "point-3-563",                                                              // 未提供名称
                // "point-3-564",                                                              // 未提供名称
                // "point-3-565",                                                              // 未提供名称
                // "point-3-566",                                                              // 未提供名称
                "point-3-57",                                                               // 传送锚点
                "point-3-570",                                                              // 荒泷豪鼓祭
                // "point-3-574",                                                              // 未提供名称
                "point-3-575",                                                              // 传送锚点
                "point-3-577",                                                              // 传送锚点
                // "point-3-578",                                                              // 未提供名称
                "point-3-58",                                                               // 传送锚点
                // "point-3-580",                                                              // 未提供名称
                "point-3-586",                                                              // 传送锚点
                "point-3-587",                                                              // 传送锚点
                "point-3-588",                                                              // 传送锚点
                "point-3-589",                                                              // 传送锚点
                "point-3-59",                                                               // 传送锚点
                "point-3-598",                                                              // 传送锚点
                "point-3-599",                                                              // 传送锚点
                "point-3-6",                                                                // 传送锚点
                "point-3-60",                                                               // 传送锚点
                "point-3-600",                                                              // 河谷的黯道
                "point-3-602",                                                              // 传送锚点
                "point-3-603",                                                              // 传送锚点
                "point-3-604",                                                              // 传送锚点
                "point-3-605",                                                              // 传送锚点
                "point-3-606",                                                              // 传送锚点
                "point-3-607",                                                              // 童梦的切片
                "point-3-61",                                                               // 传送锚点
                "point-3-612",                                                              // 传送锚点
                "point-3-615",                                                              // 传送锚点
                "point-3-616",                                                              // 传送锚点
                "point-3-618",                                                              // 伞盖的荫蔽
                "point-3-62",                                                               // 猎鹿人
                // "point-3-622",                                                              // 未提供名称
                "point-3-623",                                                              // 传送锚点
                "point-3-625",                                                              // 七天神像-草
                "point-3-626",                                                              // 传送锚点
                "point-3-629",                                                              // 七天神像-草
                "point-3-631",                                                              // 传送锚点
                "point-3-632",                                                              // 传送锚点
                "point-3-633",                                                              // 传送锚点
                "point-3-634",                                                              // 传送锚点
                "point-3-635",                                                              // 传送锚点
                "point-3-636",                                                              // 传送锚点
                "point-3-637",                                                              // 传送锚点
                "point-3-638",                                                              // 传送锚点
                "point-3-639",                                                              // 传送锚点
                "point-3-64",                                                               // 荣光之风
                "point-3-640",                                                              // 传送锚点
                "point-3-641",                                                              // 传送锚点
                "point-3-642",                                                              // 传送锚点
                "point-3-643",                                                              // 传送锚点
                "point-3-644",                                                              // 传送锚点
                "point-3-645",                                                              // 传送锚点
                "point-3-646",                                                              // 晴雨的经纬
                "point-3-648",                                                              // 猫尾酒馆
                "point-3-65",                                                               // 铁匠铺
                "point-3-650",                                                              // 梦之树
                "point-3-652",                                                              // 传送锚点
                "point-3-653",                                                              // 传送锚点
                "point-3-655",                                                              // 传送锚点
                "point-3-665",                                                              // 传送锚点
                "point-3-666",                                                              // 传送锚点
                "point-3-667",                                                              // 传送锚点
                "point-3-668",                                                              // 传送锚点
                "point-3-669",                                                              // 筑机战阵
                "point-3-671",                                                              // 蜃景祭场
                "point-3-674",                                                              // 赤沙之槛
                "point-3-675",                                                              // 千柱的花园
                "point-3-676",                                                              // 传送锚点
                // "point-3-686",                                                              // 未提供名称
                // "point-3-687",                                                              // 未提供名称
                // "point-3-688",                                                              // 未提供名称
                "point-3-69",                                                               // 传送锚点
                "point-3-691",                                                              // 传送锚点
                // "point-3-694",                                                              // 未提供名称
                // "point-3-695",                                                              // 未提供名称
                // "point-3-696",                                                              // 未提供名称
                "point-3-7",                                                                // 七天神像-风
                "point-3-702",                                                              // 传送锚点
                "point-3-703",                                                              // 传送锚点
                "point-3-706",                                                              // 传送锚点
                // "point-3-707",                                                              // 未提供名称
                "point-3-72",                                                               // 七天神像-岩
                "point-3-727",                                                              // 「亡者之城」
                "point-3-729",                                                              // 五绿洲之殿堂
                "point-3-73",                                                               // 七天神像-岩
                "point-3-731",                                                              // 净琉璃工坊
                // "point-3-736",                                                              // 未提供名称
                // "point-3-737",                                                              // 未提供名称
                // "point-3-738",                                                              // 未提供名称
                // "point-3-739",                                                              // 未提供名称
                "point-3-74",                                                               // 七天神像-岩
                // "point-3-740",                                                              // 未提供名称
                "point-3-744",                                                              // 七天神像-草
                "point-3-745",                                                              // 传送锚点
                "point-3-746",                                                              // 传送锚点
                "point-3-747",                                                              // 传送锚点
                "point-3-748",                                                              // 传送锚点
                "point-3-749",                                                              // 传送锚点
                "point-3-75",                                                               // 七天神像-岩
                "point-3-750",                                                              // 传送锚点
                "point-3-751",                                                              // 传送锚点
                "point-3-752",                                                              // 传送锚点
                "point-3-753",                                                              // 传送锚点
                "point-3-754",                                                              // 传送锚点
                // "point-3-757",                                                              // 未提供名称
                "point-3-758",                                                              // 赤金的城墟
                "point-3-76",                                                               // 传送锚点
                // "point-3-760",                                                              // 未提供名称
                "point-3-764",                                                              // 传送锚点
                "point-3-767",                                                              // 传送锚点
                // "point-3-768",                                                              // 未提供名称
                // "point-3-769",                                                              // 未提供名称
                "point-3-77",                                                               // 传送锚点
                "point-3-770",                                                              // 七天神像-水
                "point-3-771",                                                              // 七天神像-水
                "point-3-772",                                                              // 七天神像-水
                // "point-3-773",                                                              // 未提供名称
                "point-3-78",                                                               // 传送锚点
                "point-3-782",                                                              // 传送锚点
                "point-3-783",                                                              // 传送锚点
                "point-3-784",                                                              // 传送锚点
                "point-3-79",                                                               // 传送锚点
                // "point-3-791",                                                              // 未提供名称
                // "point-3-792",                                                              // 未提供名称
                // "point-3-793",                                                              // 未提供名称
                "point-3-797",                                                              // 传送锚点
                "point-3-798",                                                              // 传送锚点
                // "point-3-799",                                                              // 未提供名称
                "point-3-8",                                                                // 传送锚点
                "point-3-803",                                                              // 熔铁的孤塞
                "point-3-805",                                                              // 净罪之井
                "point-3-807",                                                              // 地中的香海
                "point-3-809",                                                              // 花海·甘露池
                "point-3-81",                                                               // 传送锚点
                "point-3-811",                                                              // 七天神像-草
                "point-3-814",                                                              // 七天神像-水
                "point-3-815",                                                              // 七天神像-水
                "point-3-817",                                                              // 传送锚点
                "point-3-818",                                                              // 传送锚点
                "point-3-819",                                                              // 传送锚点
                "point-3-82",                                                               // 传送锚点
                "point-3-820",                                                              // 传送锚点
                "point-3-821",                                                              // 传送锚点
                "point-3-822",                                                              // 传送锚点
                "point-3-823",                                                              // 传送锚点
                "point-3-824",                                                              // 传送锚点
                "point-3-825",                                                              // 传送锚点
                "point-3-826",                                                              // 传送锚点
                "point-3-827",                                                              // 传送锚点
                "point-3-828",                                                              // 传送锚点
                "point-3-829",                                                              // 传送锚点
                "point-3-830",                                                              // 传送锚点
                "point-3-831",                                                              // 传送锚点
                "point-3-832",                                                              // 梅洛彼得堡
                "point-3-833",                                                              // 传送锚点
                "point-3-834",                                                              // 与纯水精灵安的冒险
                // "point-3-835",                                                              // 未提供名称
                // "point-3-836",                                                              // 未提供名称
                "point-3-84",                                                               // 传送锚点
                // "point-3-840",                                                              // 未提供名称
                "point-3-841",                                                              // 传送锚点
                "point-3-842",                                                              // 传送锚点
                // "point-3-843",                                                              // 未提供名称
                // "point-3-844",                                                              // 未提供名称
                // "point-3-845",                                                              // 未提供名称
                // "point-3-846",                                                              // 未提供名称
                // "point-3-847",                                                              // 未提供名称
                "point-3-848",                                                              // 肇始之乡
                "point-3-85",                                                               // 传送锚点
                // "point-3-852",                                                              // 未提供名称
                "point-3-855",                                                              // 传送锚点
                "point-3-856",                                                              // 传送锚点
                "point-3-857",                                                              // 传送锚点
                "point-3-858",                                                              // 传送锚点
                "point-3-859",                                                              // 深潮的余响
                "point-3-86",                                                               // 传送锚点
                "point-3-861",                                                              // 传送锚点
                "point-3-862",                                                              // 传送锚点
                "point-3-864",                                                              // 传送锚点
                "point-3-865",                                                              // 苍白的遗荣
                "point-3-867",                                                              // 传送锚点
                "point-3-868",                                                              // 传送锚点
                "point-3-87",                                                               // 传送锚点
                "point-3-870",                                                              // 传送锚点
                "point-3-871",                                                              // 传送锚点
                "point-3-872",                                                              // 传送锚点
                "point-3-873",                                                              // 传送锚点
                "point-3-874",                                                              // 传送锚点
                "point-3-875",                                                              // 传送锚点
                "point-3-876",                                                              // 传送锚点
                "point-3-877",                                                              // 传送锚点
                "point-3-878",                                                              // 传送锚点
                "point-3-879",                                                              // 传送锚点
                "point-3-880",                                                              // 传送锚点
                "point-3-881",                                                              // 传送锚点
                "point-3-882",                                                              // 传送锚点
                "point-3-883",                                                              // 传送锚点
                "point-3-884",                                                              // 传送锚点
                "point-3-885",                                                              // 传送锚点
                "point-3-887",                                                              // 传送锚点
                "point-3-895",                                                              // 与纯水精灵安的冒险
                "point-3-896",                                                              // 与纯水精灵安的冒险
                "point-3-897",                                                              // 与纯水精灵安的冒险
                "point-3-898",                                                              // 沫芒宫
                "point-3-900",                                                              // 德波大饭店
                "point-3-902",                                                              // 欧庇克莱歌剧院
                "point-3-904",                                                              // 传送锚点
                "point-3-905",                                                              // 传送锚点
                "point-3-906",                                                              // 传送锚点
                "point-3-909",                                                              // 传送锚点
                "point-3-91",                                                               // 传送锚点
                "point-3-910",                                                              // 传送锚点
                "point-3-911",                                                              // 传送锚点
                "point-3-912",                                                              // 传送锚点
                "point-3-915",                                                              // 传送锚点
                // "point-3-916",                                                              // 未提供名称
                // "point-3-917",                                                              // 未提供名称
                // "point-3-918",                                                              // 未提供名称
                // "point-3-919",                                                              // 未提供名称
                "point-3-92",                                                               // 传送锚点
                // "point-3-920",                                                              // 未提供名称
                "point-3-921",                                                              // 传送锚点
                "point-3-922",                                                              // 七天神像-水
                "point-3-923",                                                              // 七天神像-水
                "point-3-926",                                                              // 传送锚点
                "point-3-929",                                                              // 传送锚点
                "point-3-93",                                                               // 传送锚点
                "point-3-933",                                                              // 传送锚点
                "point-3-934",                                                              // 传送锚点
                "point-3-935",                                                              // 传送锚点
                // "point-3-936",                                                              // 未提供名称
                // "point-3-937",                                                              // 未提供名称
                // "point-3-938",                                                              // 未提供名称
                // "point-3-939",                                                              // 未提供名称
                // "point-3-940",                                                              // 未提供名称
                // "point-3-941",                                                              // 未提供名称
                // "point-3-942",                                                              // 未提供名称
                // "point-3-943",                                                              // 未提供名称
                "point-3-944",                                                              // 水仙十字结社
                "point-3-947",                                                              // 七天神像-岩
                "point-3-948",                                                              // 七天神像-岩
                "point-3-949",                                                              // 传送锚点
                "point-3-95",                                                               // 传送锚点
                "point-3-950",                                                              // 传送锚点
                "point-3-951",                                                              // 传送锚点
                "point-3-952",                                                              // 传送锚点
                "point-3-953",                                                              // 传送锚点
                "point-3-954",                                                              // 传送锚点
                "point-3-955",                                                              // 传送锚点
                "point-3-956",                                                              // 传送锚点
                "point-3-957",                                                              // 传送锚点
                "point-3-958",                                                              // 传送锚点
                "point-3-959",                                                              // 传送锚点
                "point-3-96",                                                               // 传送锚点
                "point-3-960",                                                              // 传送锚点
                "point-3-961",                                                              // 传送锚点
                "point-3-962",                                                              // 传送锚点
                "point-3-963",                                                              // 传送锚点
                "point-3-964",                                                              // 传送锚点
                "point-3-965",                                                              // 传送锚点
                "point-3-966",                                                              // 传送锚点
                "point-3-97",                                                               // 传送锚点
                "point-3-971",                                                              // 传送锚点
                // "point-3-974",                                                              // 未提供名称
                // "point-3-975",                                                              // 未提供名称
                "point-3-98",                                                               // 冒险家协会
                "point-3-980",                                                              // 露景泉
                "point-3-982",                                                              // 罪祸的终末
                "point-3-985",                                                              // 传送锚点
                "point-3-99",                                                               // 传送锚点
                "point-3-990",                                                              // 传送锚点
                "point-3-999",                                                              // 传送锚点
                // #endregion places:point
            ],
            "areas": [
                "world-area-10600",                                                         // 风息山（一级区域）
                "world-area-10601",                                                         // 荆夫港（二级区域）
                "world-area-10602",                                                         // 风车镇（二级区域）
                "world-area-10603",                                                         // 疗养院旧址（二级区域）
                "world-area-1100",                                                          // 坠星山谷（一级区域）
                "world-area-1101",                                                          // 果酒湖（二级区域）
                "world-area-1102",                                                          // 蒙德城（二级区域）
                "world-area-1103",                                                          // 星落湖（二级区域）
                "world-area-1104",                                                          // 望风山地（二级区域）
                "world-area-1105",                                                          // 望风角（二级区域）
                "world-area-1106",                                                          // 摘星崖（二级区域）
                "world-area-1107",                                                          // 千风神殿（二级区域）
                "world-area-1108",                                                          // 低语森林（二级区域）
                "world-area-1109",                                                          // 望风海岸（二级区域）
                "world-area-1110",                                                          // 坠星山谷（二级区域）
                "world-area-1200",                                                          // 风啸山坡（一级区域）
                "world-area-1201",                                                          // 风起地（二级区域）
                "world-area-1202",                                                          // 鹰翔海滩（二级区域）
                "world-area-1203",                                                          // 达达乌帕谷（二级区域）
                "world-area-1204",                                                          // 誓言岬（二级区域）
                "world-area-1205",                                                          // 马斯克礁（二级区域）
                "world-area-1300",                                                          // 苍风高地（一级区域）
                "world-area-1301",                                                          // 清泉镇（二级区域）
                "world-area-1302",                                                          // 晨曦酒庄（二级区域）
                "world-area-1400",                                                          // 明冠山地（一级区域）
                "world-area-1401",                                                          // 风龙废墟（二级区域）
                "world-area-1402",                                                          // 奔狼领（二级区域）
                "world-area-1403",                                                          // 明冠峡（二级区域）
                "world-area-1500",                                                          // 龙脊雪山（一级区域）
                "world-area-1501",                                                          // 覆雪之路（二级区域）
                "world-area-1502",                                                          // 雪葬之都·旧宫（二级区域）
                "world-area-1503",                                                          // 雪葬之都·近郊（二级区域）
                "world-area-1504",                                                          // 眠龙谷（二级区域）
                "world-area-1505",                                                          // 星荧洞窟（二级区域）
                "world-area-1506",                                                          // 寒天之钉（二级区域）
                "world-area-21001",                                                         // 沉玉谷·上谷（一级区域）
                "world-area-21002",                                                         // 翘英庄（二级区域）
                "world-area-21003",                                                         // 遗珑埠（二级区域）
                "world-area-21004",                                                         // 灵濛山（二级区域）
                "world-area-21005",                                                         // 宝玦口（二级区域）
                "world-area-21006",                                                         // 沉珑渊（二级区域）
                "world-area-21007",                                                         // 暝垣山（二级区域）
                "world-area-21101",                                                         // 沉玉谷·南陵（一级区域）
                "world-area-21102",                                                         // 赤璋城垣（二级区域）
                "world-area-21103",                                                         // 药蝶谷（二级区域）
                "world-area-21104",                                                         // 悬练山（二级区域）
                "world-area-21105",                                                         // 来歆山（二级区域）
                "world-area-21106",                                                         // 暝垣山（废弃）（二级区域）
                "world-area-21107",                                                         // 古茶树坡（二级区域）
                "world-area-21108",                                                         // 锦落庭（废弃）（二级区域）
                "world-area-21109",                                                         // 灵枢庭（二级区域）
                "world-area-21110",                                                         // 伏仙洞（二级区域）
                "world-area-21201",                                                         // 来歆山（一级区域）
                "world-area-21202",                                                         // 赤望台（二级区域）
                "world-area-21203",                                                         // 锦落庭（二级区域）
                "world-area-2200",                                                          // 层岩巨渊（一级区域）
                "world-area-2201",                                                          // 地面矿区（二级区域）
                "world-area-2202",                                                          // 巨渊之口（二级区域）
                "world-area-2203",                                                          // 琉璃峰（二级区域）
                "world-area-2204",                                                          // 天工峡（二级区域）
                "world-area-2205",                                                          // 丹砂崖（二级区域）
                "world-area-2206",                                                          // 伏鳌谷（二级区域）
                "world-area-2207",                                                          // 采樵谷（二级区域）
                "world-area-2500",                                                          // 碧水原（一级区域）
                "world-area-2501",                                                          // 石门（二级区域）
                "world-area-2502",                                                          // 地中之盐（二级区域）
                "world-area-2503",                                                          // 荻花洲（二级区域）
                "world-area-2504",                                                          // 望舒客栈（二级区域）
                "world-area-2505",                                                          // 归离原（二级区域）
                "world-area-2506",                                                          // 瑶光滩（二级区域）
                "world-area-2507",                                                          // 轻策庄（二级区域）
                "world-area-2508",                                                          // 明蕴镇（二级区域）
                "world-area-2509",                                                          // 渌华池（二级区域）
                "world-area-2510",                                                          // 无妄坡（二级区域）
                "world-area-2600",                                                          // 珉林（一级区域）
                "world-area-2601",                                                          // 绝云间（二级区域）
                "world-area-2602",                                                          // 华光林（二级区域）
                "world-area-2603",                                                          // 奥藏山（二级区域）
                "world-area-2604",                                                          // 琥牢山（二级区域）
                "world-area-2605",                                                          // 南天门（二级区域）
                "world-area-2606",                                                          // 庆云顶（二级区域）
                "world-area-2607",                                                          // 翠玦坡（二级区域）
                "world-area-2700",                                                          // 云来海（一级区域）
                "world-area-2701",                                                          // 璃月港（二级区域）
                "world-area-2702",                                                          // 天衡山（二级区域）
                "world-area-2703",                                                          // 孤云阁（二级区域）
                "world-area-2800",                                                          // 璃沙郊（一级区域）
                "world-area-2801",                                                          // 遁玉陵（二级区域）
                "world-area-2802",                                                          // 灵矩关（二级区域）
                "world-area-2803",                                                          // 青墟浦（二级区域）
                "world-area-2805",                                                          // 天遒谷（二级区域）
                "world-area-2900",                                                          // 琼玑野（一级区域）
                "world-area-3100",                                                          // 鸣神岛（一级区域）
                "world-area-3101",                                                          // 稻妻城（二级区域）
                "world-area-3102",                                                          // 离岛（二级区域）
                "world-area-3103",                                                          // 绀田村（二级区域）
                "world-area-3104",                                                          // 白狐之野（二级区域）
                "world-area-3105",                                                          // 甘金岛（二级区域）
                "world-area-3106",                                                          // 镇守之森（二级区域）
                "world-area-3107",                                                          // 神里屋敷（二级区域）
                "world-area-3108",                                                          // 影向山（二级区域）
                "world-area-3109",                                                          // 鸣神大社（二级区域）
                "world-area-3110",                                                          // 荒海（二级区域）
                "world-area-3111",                                                          // 刃连岛（二级区域）
                "world-area-3200",                                                          // 神无冢（一级区域）
                "world-area-3201",                                                          // 踏鞴砂（二级区域）
                "world-area-3202",                                                          // 九条阵屋（二级区域）
                "world-area-3300",                                                          // 八酝岛（一级区域）
                "world-area-3301",                                                          // 蛇骨矿洞（二级区域）
                "world-area-3302",                                                          // 名椎滩（二级区域）
                "world-area-3303",                                                          // 藤兜砦（二级区域）
                "world-area-3304",                                                          // 无想刃狭间（二级区域）
                "world-area-3305",                                                          // 绯木村（二级区域）
                "world-area-3306",                                                          // 无明砦（二级区域）
                "world-area-3307",                                                          // 蛇神之首（二级区域）
                "world-area-3400",                                                          // 清籁岛（一级区域）
                "world-area-3401",                                                          // 天云峠（二级区域）
                "world-area-3402",                                                          // 浅濑神社（二级区域）
                "world-area-3403",                                                          // 「清籁丸」（二级区域）
                "world-area-3404",                                                          // 越石村（二级区域）
                "world-area-3405",                                                          // 平海砦（二级区域）
                "world-area-3500",                                                          // 海祇岛（一级区域）
                "world-area-3501",                                                          // 珊瑚宫（二级区域）
                "world-area-3502",                                                          // 曚云神社（二级区域）
                "world-area-3503",                                                          // 望泷村（二级区域）
                "world-area-3504",                                                          // 水月池（二级区域）
                "world-area-3600",                                                          // 鹤观（一级区域）
                "world-area-3601",                                                          // 知比山（二级区域）
                "world-area-3602",                                                          // 千来神祠（二级区域）
                "world-area-3603",                                                          // 笈名海滨（二级区域）
                "world-area-3604",                                                          // 菅名山（二级区域）
                "world-area-3605",                                                          // 逢岳之野（二级区域）
                "world-area-3606",                                                          // 茂知祭场（二级区域）
                "world-area-3607",                                                          // 惑饲滩（二级区域）
                "world-area-4000",                                                          // 桓那兰那（一级区域）
                "world-area-4001",                                                          // 未提供名称（二级区域）
                "world-area-4100",                                                          // 护世森（一级区域）
                "world-area-41000",                                                         // 荒石苍漠（一级区域）
                "world-area-41001",                                                         // 荼泥黑渊（二级区域）
                "world-area-41002",                                                         // 阻勒隘（二级区域）
                "world-area-41003",                                                         // 铁穆山（二级区域）
                "world-area-41004",                                                         // 逾渊地墟（二级区域）
                "world-area-4101",                                                          // 无郁稠林（二级区域）
                "world-area-4102",                                                          // 茸蕈窟（二级区域）
                "world-area-4103",                                                          // 卡萨扎莱宫（二级区域）
                "world-area-4104",                                                          // 拜达港（二级区域）
                "world-area-41100",                                                         // 浮罗囿（一级区域）
                "world-area-41101",                                                         // 未提供名称（二级区域）
                "world-area-41102",                                                         // 锋刃林泽（二级区域）
                "world-area-41103",                                                         // 跋松顶（二级区域）
                "world-area-41104",                                                         // 聚香海岸（二级区域）
                "world-area-41105",                                                         // 精石铜城（二级区域）
                "world-area-41106",                                                         // 遗忘之路（二级区域）
                "world-area-4200",                                                          // 阿陀河谷（一级区域）
                "world-area-4201",                                                          // 迪弗旧窟（二级区域）
                "world-area-4202",                                                          // 维摩庄（二级区域）
                "world-area-4203",                                                          // 奥摩斯港（二级区域）
                "world-area-4204",                                                          // 降诸魔山（二级区域）
                "world-area-4300",                                                          // 二净甸（一级区域）
                "world-area-4301",                                                          // 未提供名称（二级区域）
                "world-area-4400",                                                          // 善见地（一级区域）
                "world-area-4401",                                                          // 禅那园（二级区域）
                "world-area-4402",                                                          // 谒颂幽境（二级区域）
                "world-area-4403",                                                          // 水天丛林（二级区域）
                "world-area-4404",                                                          // 喀万驿（二级区域）
                "world-area-4405",                                                          // 荼诃之座（二级区域）
                "world-area-4406",                                                          // 未提供名称（二级区域）
                "world-area-4407",                                                          // 未提供名称（二级区域）
                "world-area-4408",                                                          // 荼诃之座（二级区域）
                "world-area-4500",                                                          // 道成林（一级区域）
                "world-area-4501",                                                          // 化城郭（二级区域）
                "world-area-4502",                                                          // 须弥城（二级区域）
                "world-area-4503",                                                          // 寂静园（二级区域）
                "world-area-4504",                                                          // 教令院（二级区域）
                "world-area-4505",                                                          // 净善宫（二级区域）
                "world-area-4506",                                                          // 大巴扎（二级区域）
                "world-area-4507",                                                          // 宝商街（二级区域）
                "world-area-4508",                                                          // 离渡谷（二级区域）
                "world-area-4509",                                                          // 天臂池（二级区域）
                "world-area-4510",                                                          // 香醉坡（二级区域）
                "world-area-4511",                                                          // 须弥城（二级区域）
                "world-area-4512",                                                          // 未提供名称（二级区域）
                "world-area-4600",                                                          // 失落的苗圃（一级区域）
                "world-area-4601",                                                          // (test)觉王之殿(废弃)（二级区域）
                "world-area-4602",                                                          // 未提供名称（二级区域）
                "world-area-4603",                                                          // 沙中故里（二级区域）
                "world-area-4604",                                                          // 失梦的国土（二级区域）
                "world-area-4700",                                                          // 下风蚀地（一级区域）
                "world-area-4701",                                                          // 阿如村（二级区域）
                "world-area-4702",                                                          // 沙之眼（二级区域）
                "world-area-4703",                                                          // 活力之家（二级区域）
                "world-area-4704",                                                          // 舍身步道（二级区域）
                "world-area-4800",                                                          // 列柱沙原（一级区域）
                "world-area-4801",                                                          // 赤王陵（二级区域）
                "world-area-4802",                                                          // 未提供名称（二级区域）
                "world-area-4803",                                                          // 祝祭厅（二级区域）
                "world-area-4804",                                                          // 权杖厅（二级区域）
                "world-area-4805",                                                          // 渡厄厅（二级区域）
                "world-area-4806",                                                          // 衡准大厅（二级区域）
                "world-area-4807",                                                          // 未提供名称（二级区域）
                "world-area-4808",                                                          // 饱饮之丘（二级区域）
                "world-area-4809",                                                          // 铄石之丘（二级区域）
                "world-area-4810",                                                          // 避让之丘（二级区域）
                "world-area-4811",                                                          // 丰饶绿洲（二级区域）
                "world-area-4900",                                                          // 上风蚀地（一级区域）
                "world-area-4901",                                                          // 荼诃落谷（二级区域）
                "world-area-4902",                                                          // 吞羊岩（二级区域）
                "world-area-5000",                                                          // 千壑沙地（一级区域）
                "world-area-5001",                                                          // 塔尼特露营地（二级区域）
                "world-area-5002",                                                          // 神弃殿阁（二级区域）
                "world-area-5003",                                                          // 巨人峡谷（二级区域）
                "world-area-5004",                                                          // 亡者狭廊（二级区域）
                "world-area-5005",                                                          // 啁哳之沙（二级区域）
                "world-area-5006",                                                          // 镔铁沙丘（二级区域）
                "world-area-5007",                                                          // 「五绿洲」的孑遗（二级区域）
                "world-area-5008",                                                          // 折胫谷（二级区域）
                "world-area-5009",                                                          // 愚妄行宫（二级区域）
                "world-area-5010",                                                          // 「三运河之地」（二级区域）
                "world-area-50100",                                                         // 白露区（一级区域）
                "world-area-50101",                                                         // 海露港（二级区域）
                "world-area-50102",                                                         // 埃尔顿海沟（二级区域）
                "world-area-50103",                                                         // 白淞镇（二级区域）
                "world-area-50104",                                                         // 秋分山西侧（二级区域）
                "world-area-5011",                                                          // 达马山（二级区域）
                "world-area-5012",                                                          // 居尔城墟·赤王神殿（二级区域）
                "world-area-5013",                                                          // 镇灵监牢（二级区域）
                "world-area-5014",                                                          // 沙虫隧道（二级区域）
                "world-area-5015",                                                          // 君王之殿（二级区域）
                "world-area-5016",                                                          // 酣乐之殿（二级区域）
                "world-area-5017",                                                          // 生命之殿（二级区域）
                "world-area-5018",                                                          // 「赤王的水晶杯」（二级区域）
                "world-area-5019",                                                          // 「永恒绿洲」（二级区域）
                "world-area-5020",                                                          // 园圃之遗（二级区域）
                "world-area-50200",                                                         // 苍晶区（一级区域）
                "world-area-50201",                                                         // 未提供名称（二级区域）
                "world-area-50202",                                                         // 厄里那斯（二级区域）
                "world-area-50203",                                                         // 「特别温暖的地方」（二级区域）
                "world-area-50204",                                                         // 「很明亮的地方」（二级区域）
                "world-area-50205",                                                         // 海沫村（二级区域）
                "world-area-50206",                                                         // 「寂寞的地方」（二级区域）
                "world-area-50207",                                                         // 很高兴见到你（二级区域）
                "world-area-50208",                                                         // ？？？（二级区域）
                "world-area-5021",                                                          // 阿佩普的行宫花园（二级区域）
                "world-area-5022",                                                          // 「永恒绿洲」（二级区域）
                "world-area-50300",                                                         // 枫丹廷区（一级区域）
                "world-area-50301",                                                         // 露景泉（二级区域）
                "world-area-50302",                                                         // 未提供名称（二级区域）
                "world-area-50304",                                                         // 未提供名称（二级区域）
                "world-area-50305",                                                         // 未提供名称（二级区域）
                "world-area-50306",                                                         // 欧庇克莱歌剧院（二级区域）
                "world-area-50307",                                                         // 茉洁站（二级区域）
                "world-area-50308",                                                         // 塔拉塔海谷（二级区域）
                "world-area-50309",                                                         // 塞洛海原（二级区域）
                "world-area-50310",                                                         // 希望之路（二级区域）
                "world-area-50311",                                                         // 枫丹廷（二级区域）
                "world-area-50312",                                                         // 未提供名称（二级区域）
                "world-area-50313",                                                         // 未提供名称（二级区域）
                "world-area-50314",                                                         // 枫丹廷·灰河（二级区域）
                "world-area-50315",                                                         // 枫丹廷（二级区域）
                "world-area-50316",                                                         // 枫丹廷·利奥奈区（二级区域）
                "world-area-50317",                                                         // 枫丹廷·纳博内区（二级区域）
                "world-area-50318",                                                         // 枫丹廷·廷区水道枢纽（二级区域）
                "world-area-50319",                                                         // 枫丹廷·沫芒宫（二级区域）
                "world-area-50320",                                                         // 枫丹廷·瓦萨里回廊（二级区域）
                "world-area-50400",                                                         // 黎翡区（一级区域）
                "world-area-50401",                                                         // 管理区（二级区域）
                "world-area-50402",                                                         // (废弃)奎瑟尔的发条工坊（二级区域）
                "world-area-50403",                                                         // 生产区（二级区域）
                "world-area-50404",                                                         // 废弃生产区（二级区域）
                "world-area-50405",                                                         // 梅洛彼得堡（二级区域）
                "world-area-50406",                                                         // 芒索斯山东麓（二级区域）
                "world-area-50500",                                                         // 枫丹动能工程科学研究院区（一级区域）
                "world-area-50501",                                                         // 中央实验室遗址（二级区域）
                "world-area-50502",                                                         // 新枫丹科学院（二级区域）
                "world-area-50503",                                                         // 行政院（二级区域）
                "world-area-50504",                                                         // 资料院（二级区域）
                "world-area-50505",                                                         // 学术会堂（二级区域）
                "world-area-50506",                                                         // 玛丽安纪念公园（二级区域）
                "world-area-50507",                                                         // 德吕阿松林（二级区域）
                "world-area-50508",                                                         // 奎瑟尔的发条工坊（二级区域）
                "world-area-50600",                                                         // 伊黎耶林区（一级区域）
                "world-area-50700",                                                         // 莫尔泰区（一级区域）
                "world-area-50701",                                                         // 闭锁的遗迹塔（二级区域）
                "world-area-50702",                                                         // 未提供名称（二级区域）
                "world-area-50703",                                                         // 未提供名称（二级区域）
                "world-area-50704",                                                         // 未提供名称（二级区域）
                "world-area-50705",                                                         // 未提供名称（二级区域）
                "world-area-50706",                                                         // 某微观宇宙的肇始（二级区域）
                "world-area-50707",                                                         // ？？？（二级区域）
                "world-area-50708",                                                         // ？？？（二级区域）
                "world-area-50709",                                                         // ？？？（二级区域）
                "world-area-50710",                                                         // ？？？（二级区域）
                "world-area-50711",                                                         // ？？？（二级区域）
                "world-area-50712",                                                         // ？？？（二级区域）
                "world-area-50719",                                                         // 秋分山东侧（二级区域）
                "world-area-50720",                                                         // 卡布狄斯堡遗迹（二级区域）
                "world-area-50721",                                                         // 湖中垂柳（二级区域）
                "world-area-50722",                                                         // 幽林雾道（二级区域）
                "world-area-50723",                                                         // 优兰尼娅湖（二级区域）
                "world-area-50724",                                                         // 「锈舵」（二级区域）
                "world-area-50725",                                                         // 柔灯港（二级区域）
                "world-area-50726",                                                         // 伊黎耶之根（二级区域）
                "world-area-50727",                                                         // 自体自身之塔·上部（二级区域）
                "world-area-50728",                                                         // 自体自身之塔·中部（二级区域）
                "world-area-50729",                                                         // 自体自身之塔·下部（二级区域）
                "world-area-50730",                                                         // 未提供名称（二级区域）
                "world-area-50731",                                                         // 未提供名称（二级区域）
                "world-area-50732",                                                         // 未提供名称（二级区域）
                "world-area-50800",                                                         // 诺思托伊区（一级区域）
                "world-area-50801",                                                         // 褪色古堡（二级区域）
                "world-area-50802",                                                         // 佩特莉可镇（二级区域）
                "world-area-60100",                                                         // 坚岩隘谷（一级区域）
                "world-area-60101",                                                         // 坚岩隘谷（二级区域）
                "world-area-60102",                                                         // 分道誓约之厅（二级区域）
                "world-area-60103",                                                         // 始灾的边界（二级区域）
                "world-area-60104",                                                         // ？？？（二级区域）
                "world-area-60105",                                                         // ？？？（二级区域）
                "world-area-60106",                                                         // 「回声之子」（二级区域）
                "world-area-60107",                                                         // 硫晶支脉（二级区域）
                "world-area-60108",                                                         // 众岩之里（二级区域）
                "world-area-60109",                                                         // 隆崛坡（二级区域）
                "world-area-60200",                                                         // 万火之瓯（一级区域）
                "world-area-60201",                                                         // 夜魂试炼之所（二级区域）
                "world-area-60202",                                                         // 圣火竞技场（二级区域）
                "world-area-60203",                                                         // 圣火竞技场（二级区域）
                "world-area-60204",                                                         // 圣火竞技场·帕克斯神庙（二级区域）
                "world-area-60205",                                                         // 圣火竞技场·楚汶市集（二级区域）
                "world-area-60206",                                                         // 圣火竞技场·楚汶市集（二级区域）
                "world-area-60207",                                                         // 柴薪之丘（二级区域）
                "world-area-60300",                                                         // 涌流地（一级区域）
                "world-area-60301",                                                         // 「夜神之国」（二级区域）
                "world-area-60302",                                                         // 「流泉之众」（二级区域）
                "world-area-60303",                                                         // 溶水域（二级区域）
                "world-area-60304",                                                         // 浮土静界（二级区域）
                "world-area-60400",                                                         // 踞石山（一级区域）
                "world-area-60401",                                                         // 「悬木人」（二级区域）
                "world-area-60402",                                                         // 「夜神之国」（二级区域）
                "world-area-60403",                                                         // 彩石顶（二级区域）
                "world-area-60404",                                                         // 祖遗庙宇（二级区域）
                "world-area-60405",                                                         // 燃素开采研究所（二级区域）
                "world-area-60406",                                                         // 窃火者密岛（二级区域）
                "world-area-60500",                                                         // 镜璧山（一级区域）
                "world-area-60501",                                                         // ？？？（二级区域）
                "world-area-60502",                                                         // 荧草窟（二级区域）
                "world-area-60503",                                                         // 「烟谜主」（二级区域）
                "world-area-60504",                                                         // 焚风试炼处（二级区域）
                "world-area-60505",                                                         // （test）翼手龙部落（二级区域）
                "world-area-60506",                                                         // 谜土祭祀场（二级区域）
                "world-area-60507",                                                         // 「编织处」（二级区域）
                "world-area-60508",                                                         // 浮羽之湾（二级区域）
                "world-area-60509",                                                         // 漫曛谷（二级区域）
                "world-area-60510",                                                         // ？？？（二级区域）
                "world-area-60600",                                                         // 奥奇卡纳塔（一级区域）
                "world-area-60601",                                                         // ？？？（二级区域）
                "world-area-60602",                                                         // 流灰之街（二级区域）
                "world-area-60603",                                                         // 统律之心（二级区域）
                "world-area-60604",                                                         // 烬火炽燃所（二级区域）
                "world-area-60605",                                                         // 烬火炽燃所（二级区域）
                "world-area-60606",                                                         // 烬火炽燃所（二级区域）
                "world-area-60607",                                                         // 烬火炽燃所（二级区域）
                "world-area-60608",                                                         // 旧日的统律之心（二级区域）
                "world-area-60609",                                                         // 噩梦的温床（二级区域）
                "world-area-60610",                                                         // 托佐兹之岛（二级区域）
                "world-area-60611",                                                         // ？？？（二级区域）
                "world-area-60612",                                                         // 烬火炽燃所（二级区域）
                "world-area-60613",                                                         // 火鹦之塔（二级区域）
                "world-area-60614",                                                         // 幻蛇之宫（二级区域）
                "world-area-60615",                                                         // 空梦的起始（二级区域）
                "world-area-60616",                                                         // 七燃烧之井（二级区域）
                "world-area-60617",                                                         // 未提供名称（二级区域）
                "world-area-60700",                                                         // 安饶之野（一级区域）
                "world-area-60701",                                                         // 「沃陆之邦」（二级区域）
                "world-area-60702",                                                         // 石火坠陨处（二级区域）
                "world-area-60703",                                                         // 孑遗的留迹（二级区域）
                "world-area-60704",                                                         // 「天火之冠」（二级区域）
                "world-area-60705",                                                         // 觐山古道（二级区域）
                "world-area-60800",                                                         // 悠悠度假村（一级区域）
                "world-area-60801",                                                         // 悠悠集市（二级区域）
                "world-area-60802",                                                         // 彩彩崖（二级区域）
                "world-area-60803",                                                         // 呼呼丘（二级区域）
                "world-area-60804",                                                         // 浪浪湾（二级区域）
                "world-area-60805",                                                         // 刺梨岩（二级区域）
                "world-area-60806",                                                         // 提提岛（二级区域）
                "world-area-60807",                                                         // 刺梨镇（二级区域）
                "world-area-60808",                                                         // ？？？（二级区域）
                "world-area-60809",                                                         // ？？？（二级区域）
                "world-area-60810",                                                         // ？？？（二级区域）
                "world-area-60900",                                                         // 翘枝崖（一级区域）
                "world-area-60901",                                                         // 「花羽会」（二级区域）
                "world-area-70100",                                                         // 帕哈岛（一级区域）
                "world-area-70101",                                                         // 月矩力试验设计局（二级区域）
                "world-area-70102",                                                         // 南港（二级区域）
                "world-area-70103",                                                         // 北港（二级区域）
                "world-area-70104",                                                         // 绯沙盐沼（二级区域）
                "world-area-70105",                                                         // 终夜长茔（二级区域）
                "world-area-70200",                                                         // 伦波岛（一级区域）
                "world-area-70201",                                                         // 那夏镇（二级区域）
                "world-area-70202",                                                         // 叮铃哐啷蛋卷工坊（二级区域）
                "world-area-70203",                                                         // 北方训练场（二级区域）
                "world-area-70204",                                                         // 苔骨荒原（二级区域）
                "world-area-70205",                                                         // 星砂滩（二级区域）
                "world-area-70206",                                                         // 蓝珀湖（二级区域）
                "world-area-70207",                                                         // 刻拉蒂之眼（二级区域）
                "world-area-70208",                                                         // 空寂走廊（二级区域）
                "world-area-70209",                                                         // 苔骨荒原（二级区域）
                "world-area-70300",                                                         // 希汐岛（一级区域）
                "world-area-70301",                                                         // 霜月之坊（二级区域）
                "world-area-70302",                                                         // 沐光之台（二级区域）
                "world-area-70303",                                                         // 未提供名称（二级区域）
                "world-area-70304",                                                         // 守誓者的圣所（二级区域）
                "world-area-70305",                                                         // 近月的隙间（二级区域）
                "world-area-70306",                                                         // 遗誓者的圣所（二级区域）
                "world-area-70307",                                                         // 雷图礁（二级区域）
                "world-area-70308",                                                         // 「蟹之主的宫殿」（二级区域）
                "world-area-70309",                                                         // ？？？（二级区域）
                "world-area-70310",                                                         // 销毁车间（二级区域）
                "world-area-70400",                                                         // 虚海望（一级区域）
                "world-area-70401",                                                         // (test)波赫尤拉南港（二级区域）
                "world-area-70402",                                                         // 皮拉米达城（二级区域）
                "world-area-70403",                                                         // 噩影泽地（二级区域）
                "world-area-70404",                                                         // 魔女的花园（二级区域）
                "world-area-70405",                                                         // 雷德·米勒的「伟大财宝」（二级区域）
                "world-area-70500",                                                         // 逐浪野（一级区域）
                "world-area-70501",                                                         // 「末日后的乐园」（二级区域）
                "world-area-70502",                                                         // 西风戍垒（二级区域）
                "world-area-70503",                                                         // 安瓦蒂尼尔湖（二级区域）
                "world-area-70504",                                                         // 仙灵的王廷（二级区域）
                "world-area-70505",                                                         // 凯雷丝之翼（二级区域）
                "world-area-70506",                                                         // 厄布拉神柱（二级区域）
                "world-area-70600",                                                         // 烟硌山峰（一级区域）
                "world-area-70601",                                                         // 英灵的享殿（二级区域）
                "world-area-70602",                                                         // 望崖营壁（二级区域）
                "world-area-70603",                                                         // 苦壑之下（二级区域）
                "world-area-70604",                                                         // 靡穷深壑（二级区域）
                "world-area-70605",                                                         // 特辖地研究所（二级区域）
                "world-area-70606",                                                         // 苦厄之路（二级区域）
                "world-area-70607",                                                         // 苦壑崖（二级区域）
                "world-area-70700",                                                         // 杜南纳深坑（一级区域）
                "world-area-70701",                                                         // 雾灵渚（二级区域）
                "world-area-70702",                                                         // 杜南纳前进站（二级区域）
                "world-area-80100",                                                         // 古兽冰原（一级区域）
                "world-area-80101",                                                         // 凝露镇（二级区域）
                "world-area-80102",                                                         // 曙光车站（二级区域）
                "world-area-80103",                                                         // 巡猎者木屋（二级区域）
                "world-area-80200",                                                         // 永凝冻土（一级区域）
                "world-area-80201",                                                         // 海屑镇（二级区域）
                "world-area-80202",                                                         // 彩冰镇（二级区域）
                "world-area-80203",                                                         // 悲悼的圣所（二级区域）
                "world-area-80204",                                                         // 至冬堡（二级区域）
                "world-area-80205",                                                         // 格鲁波夫（二级区域）
                "world-area-80206",                                                         // 科洛列夫茨基剧院（二级区域）
                "world-area-80207",                                                         // 列车总站（二级区域）
                "world-area-80208",                                                         // 炉灰区（二级区域）
                "world-area-80209",                                                         // 克什尼克的炉心（二级区域）
                "world-area-80210",                                                         // 「冬契军」总部（二级区域）
                "world-area-80211",                                                         // 至冬宫（二级区域）
                "world-area-80300",                                                         // 霜殛寒峰（一级区域）
                "world-area-80301",                                                         // 赫斯珀利德斯之馆（二级区域）
                "world-area-80302",                                                         // 冰结的雷枝（二级区域）
                "world-area-80303",                                                         // 云上的祭台（二级区域）
                "world-area-80305",                                                         // 霜精的村落（二级区域）
                "world-area-80306",                                                         // 汐歌洞窟（二级区域）
                "world-area-80400",                                                         // 焰羽谷（一级区域）
                "world-area-80402",                                                         // 奥古洛夫镇（二级区域）
                "world-area-80403",                                                         // 生栖树沼（二级区域）
                "world-area-80404",                                                         // 念祷的礼堂（二级区域）
                "world-area-80500",                                                         // 白桦雪葬地（一级区域）
                "world-area-80501",                                                         // 谒圣山峡（二级区域）
                "world-area-80502",                                                         // 白冕宫（二级区域）
                "world-area-80503",                                                         // ？？？（二级区域）
                "world-area-80504",                                                         // 霜冻的王厅（二级区域）
                "world-area-80505",                                                         // 永恒无忧的庭院（二级区域）
                "world-area-99100",                                                         // 未提供名称（一级区域）
                "world-area-99101",                                                         // 未提供名称（一级区域）
            ],
        },
        // #endregion scene:teyvat

        // #region scene:enkanomiya 渊下宫
        "enkanomiya": {
            "source": "scene-5",                                                            // 渊下宫
            // #region maskGroups 遮罩片区；仅整理查看入口，不合并条件或推断互斥。
            // 标记位置由组内每张图片的中心取算术平均，不维护手工坐标。
            "maskGroups": {
            },
            // #endregion maskGroups
            "labels": [
                // #region surfaceLabels 地表及独立场景原生文字
                "map-place-0a18e0191795a61df6778088",                                       // 八衢彦之地
                "map-place-193d4d0ea68b95f82402ee8c",                                       // 歧之地
                "map-place-21e4d62e4921b06cc967e5ae",                                       // 八衢姬之地
                "map-place-33bfa19e5666e1e0273d47ce",                                       // 大日御舆
                "map-place-6e40a3eee2d38216c3a91e53",                                       // 蛇肠之路
                "map-place-87141db1c4f4b8394a432723",                                       // 狭间之街
                "map-place-94ed079321f254cfcab84b8c",                                       // 渊下宫
                "map-place-950dba5e9ef25b80caa29a0d",                                       // 蛇心之地
                "map-place-b46aa1fd17e3029368117221",                                       // 常夜灵庙
                // #endregion surfaceLabels
            ],
            "places": [
                // #region places:point 地图点位
                "point-5-1",                                                                // 传送锚点
                "point-5-10",                                                               // 传送锚点
                "point-5-12",                                                               // 传送锚点
                "point-5-14",                                                               // 传送锚点
                "point-5-17",                                                               // 传送锚点
                "point-5-2",                                                                // 传送锚点
                "point-5-20",                                                               // 传送锚点
                "point-5-21",                                                               // 传送锚点
                "point-5-22",                                                               // 传送锚点
                "point-5-24",                                                               // 传送锚点
                "point-5-25",                                                               // 传送锚点
                "point-5-26",                                                               // 传送锚点
                "point-5-27",                                                               // 传送锚点
                "point-5-29",                                                               // 传送锚点
                "point-5-3",                                                                // 传送锚点
                "point-5-30",                                                               // 传送锚点
                "point-5-31",                                                               // 传送锚点
                "point-5-32",                                                               // 传送锚点
                "point-5-33",                                                               // 传送锚点
                "point-5-34",                                                               // 传送锚点
                "point-5-35",                                                               // 传送锚点
                "point-5-4",                                                                // 传送锚点
                "point-5-6",                                                                // 传送锚点
                "point-5-9",                                                                // 传送锚点
                // #endregion places:point
            ],
            "areas": [
                "world-area-3700",                                                          // 渊下宫（一级区域）
                "world-area-3701",                                                          // 蛇肠之路（二级区域）
                "world-area-3702",                                                          // 大日御舆（二级区域）
                "world-area-3703",                                                          // 狭间之街（二级区域）
                "world-area-3704",                                                          // 常夜灵庙（二级区域）
                "world-area-3705",                                                          // 蛇心之地（二级区域）
                "world-area-3706",                                                          // 八衢彦之地（二级区域）
                "world-area-3707",                                                          // 八衢姬之地（二级区域）
                "world-area-3708",                                                          // 歧之地（二级区域）
                "world-area-3709",                                                          // 龙蜥研究所（二级区域）
            ],
        },
        // #endregion scene:enkanomiya

        // #region scene:the_chasm_underground_mines 层岩巨渊·地下矿区
        "the_chasm_underground_mines": {
            "source": "scene-6",                                                            // 层岩巨渊·地下矿区
            // #region maskGroups 遮罩片区；仅整理查看入口，不合并条件或推断互斥。
            // 标记位置由组内每张图片的中心取算术平均，不维护手工坐标。
            "maskGroups": {
            },
            // #endregion maskGroups
            "labels": [
                // #region surfaceLabels 地表及独立场景原生文字
                "map-place-04c56db2e820a23fa9f32234",                                       // 巨渊主矿区
                "map-place-2e12e78ff1817a91b0bfadb9",                                       // 荧光狭道
                "map-place-415d00f651932e4db99859ee",                                       // 临时主矿道
                "map-place-42304eebe63bcd0a59f83741",                                       // 巨蛇岩洞
                "map-place-4d625d785a6866e2b1ce1be8",                                       // 层岩巨渊·地下矿区
                "map-place-58cb43a1ad6a9eedd0b39de4",                                       // 无名遗迹
                "map-place-8338148a4576f26f43a9bbe1",                                       // 崎岖石厅
                "map-place-f385d833e66c994c27861781",                                       // 地下水泽
                // #endregion surfaceLabels
            ],
            "places": [
                // #region places:point 地图点位
                "point-6-1",                                                                // 传送锚点
                "point-6-10",                                                               // 传送锚点
                "point-6-11",                                                               // 传送锚点
                "point-6-12",                                                               // 传送锚点
                "point-6-13",                                                               // 传送锚点
                "point-6-14",                                                               // 传送锚点
                "point-6-15",                                                               // 层岩巨渊安全技术员·瑾武
                "point-6-16",                                                               // 层岩巨渊安全技术员·瑾武
                "point-6-17",                                                               // 传送锚点
                // "point-6-18",                                                               // 未提供名称
                "point-6-19",                                                               // 巨渊深底
                "point-6-2",                                                                // 传送锚点
                "point-6-3",                                                                // 传送锚点
                "point-6-4",                                                                // 传送锚点
                "point-6-5",                                                                // 传送锚点
                "point-6-6",                                                                // 传送锚点
                "point-6-7",                                                                // 传送锚点
                "point-6-8",                                                                // 传送锚点
                "point-6-9",                                                                // 传送锚点
                // #endregion places:point
            ],
            "areas": [
                "world-area-3900",                                                          // 层岩巨渊·地下矿区（一级区域）
                "world-area-3901",                                                          // 临时主矿道（二级区域）
                "world-area-3902",                                                          // 巨渊主矿区（二级区域）
                "world-area-3903",                                                          // 地下水泽（二级区域）
                "world-area-3904",                                                          // 崎岖石厅（二级区域）
                "world-area-3905",                                                          // 无名遗迹（二级区域）
                "world-area-3906",                                                          // 荧光狭道（二级区域）
                "world-area-3907",                                                          // 巨蛇岩洞（二级区域）
            ],
        },
        // #endregion scene:the_chasm_underground_mines

        // #region scene:scene-9 金苹果群岛
        "scene-9": {
            "source": "scene-9",                                                            // 金苹果群岛
            // #region maskGroups 遮罩片区；仅整理查看入口，不合并条件或推断互斥。
            // 标记位置由组内每张图片的中心取算术平均，不维护手工坐标。
            "maskGroups": {
                // 地图区域 30；保留该片区的全部图像。
                "mask-area-30": [
                    "resource-atlas-26d493991277a1fd1e62cd3a",
                    "resource-atlas-2fcf6925f3935437c789539e",
                    "resource-atlas-5ddf57459b5d38c0c23bb080",
                    "resource-atlas-7165b289ab131fec0ad9402f",
                    "resource-atlas-80b4957a87f6ef22643cb5a1",
                    "resource-atlas-cc0d3d65ecc6b0629f4bf69e",
                    "resource-atlas-d7555589138fe9a99d7980d3",
                    "resource-atlas-ec042a283f2c77c43a72fc43",
                    "resource-atlas-f50fa3b7c2051c5267274647",
                    "resource-atlas-fbbfe15d1b2d047a3e7afc49",
                ],
                // 地图区域 31；保留该片区的全部图像。
                "mask-area-31": [
                    "resource-atlas-2518ab54cfb0497cb9d0d9bc",
                    "resource-atlas-4b70c9b4286d1c7395a13efd",
                    "resource-atlas-83acaca1c1affb45a5a784f7",
                    "resource-atlas-e011f7852461bbb07f78ee0d",
                ],
                // 地图区域 32；保留该片区的全部图像。
                "mask-area-32": [
                    "resource-atlas-2e94a6b1cbee4d50a4e65c60",
                    "resource-atlas-50219a6e4545e2c0628a2e4d",
                    "resource-atlas-f9ac078c29b6042cf98576e8",
                ],
                // 地图区域 33；保留该片区的全部图像。
                "mask-area-33": [
                    "resource-atlas-4827b7eac948cbf2c0d98876",
                    "resource-atlas-f584a00739c4bf6436af53d8",
                ],
            },
            // #endregion maskGroups
            "labels": [
                // #region surfaceLabels 地表及独立场景原生文字
                "map-place-7fb3b4c69e365a5de077efc3",                                       // 双双岛
                "map-place-ed8bd1e6c52d5bb84ac95cf0",                                       // 破破岛
                "map-place-ef02d8f42394f99d575b9c0a",                                       // 危危岛
                "map-place-f42fe58e3fbe47f057d9d75b",                                       // 布丁岛
                // #endregion surfaceLabels
            ],
            "places": [
                // #region places:point 地图点位
                // "point-9-11",                                                               // 未提供名称
                // "point-9-13",                                                               // 未提供名称
                // "point-9-15",                                                               // 未提供名称
                // "point-9-17",                                                               // 未提供名称
                // "point-9-19",                                                               // 未提供名称
                // "point-9-27",                                                               // 未提供名称
                // "point-9-29",                                                               // 未提供名称
                "point-9-33",                                                               // 传送锚点
                "point-9-34",                                                               // 传送锚点
                "point-9-35",                                                               // 传送锚点
                // "point-9-48",                                                               // 未提供名称
                "point-9-5",                                                                // 传送锚点
                // "point-9-50",                                                               // 未提供名称
                // "point-9-52",                                                               // 未提供名称
                // "point-9-54",                                                               // 未提供名称
                "point-9-56",                                                               // 传送锚点
                "point-9-6",                                                                // 传送锚点
                "point-9-60",                                                               // 传送锚点
                "point-9-62",                                                               // 传送锚点
                "point-9-7",                                                                // 传送锚点
                "point-9-8",                                                                // 传送锚点
                // "point-9-9",                                                                // 未提供名称
                // #endregion places:point
            ],
            "areas": [
                "world-area-102100",                                                        // 布丁岛（一级区域）
                "world-area-102200",                                                        // 双双岛（一级区域）
                "world-area-102300",                                                        // 破破岛（一级区域）
                "world-area-102400",                                                        // 危危岛（一级区域）
            ],
        },
        // #endregion scene:scene-9

        // #region scene:sea_of_bygone_eras 旧日之海
        "sea_of_bygone_eras": {
            "source": "scene-11",                                                           // 旧日之海
            // #region maskGroups 遮罩片区；仅整理查看入口，不合并条件或推断互斥。
            // 标记位置由组内每张图片的中心取算术平均，不维护手工坐标。
            "maskGroups": {
                // 分层地图：雅努斯通道 / 卡皮托利姆；按源图层组归类，条件独立计算。
                "mask-layer-group-1160004": [
                    "resource-atlas-2d655bf0b654aec58daef5d8",
                    "resource-atlas-774c1dd44ce2a8fee55132c1",
                    "resource-atlas-a3b3f3253cf526b55eded2b5",
                ],
                // 分层地图：黄金宫殿·下层 / 黄金宫殿·上层；按源图层组归类，条件独立计算。
                "mask-layer-group-1160007": [
                    "resource-atlas-d745c8e9732b0583e250a78e",
                    "resource-atlas-e3c464c980f128764447f971",
                ],
            },
            // #endregion maskGroups
            "labels": [
                // #region labels 原生地图文字；本身不需要图标。
                "map-place-03858aa2824bce9e49898b4a",                                       // 卡皮托林山
                "map-place-0800674f69c737d167c27cab",                                       // 优恩花园
                "map-place-28c3563f0f8100a8125cb825",                                       // 谐律院
                "map-place-2c10904ee885b97923db09e0",                                       // 安提库旧港
                "map-place-368cd300ae6ef97c889afb03",                                       // 沙中故里
                "map-place-4fd658d9bf5d64b3c1f1f50f",                                       // 卡皮托林山
                "map-place-51c202e31751cdfca9b9168a",                                       // 崇高大道
                "map-place-85d37b1ef0573af60be85d9f",                                       // 崇高大道
                "map-place-92be6e6e14f70ac7e9792dad",                                       // 沙中故里
                "map-place-a1e1b52957aeb0484cf3d430",                                       // 卡皮托林山
                "map-place-a7f0d092c9e2d585b2a74e1b",                                       // 安提库旧港
                "map-place-af31223305b2f6f5e1a579aa",                                       // 谐律院
                "map-place-b2a35e500ced970119a6227b",                                       // 切萨勒姆宫
                "map-place-cafb3421904d3e7d22340504",                                       // 失梦的国土
                "map-place-daea66ec86046f7be9056e35",                                       // 失梦的国土
                "map-place-e43439348b0c1298e7209eba",                                       // 谐律院
                "map-place-ea1af9760f4f723be574f530",                                       // 雅努斯之门
                "map-place-ea7a78862d1c1d4477dddf78",                                       // 沙中故里
                "map-place-f5aca5ab59a1661c5b8e97cd",                                       // 崇高大道
                "map-place-fa1784b2a22ba68919843153",                                       // 谐律院
                "map-place-fa27abef62fcc40dff777a98",                                       // 失梦的国土
                // #endregion labels
                // #region surfaceLabels 地表及独立场景原生文字
                "map-place-2a479bef4d2edb6dfc1900d4",                                       // 切萨勒姆宫
                "map-place-3132f33b241d044d2dad9bfc",                                       // 安提库旧港
                "map-place-863c076025bd3f74cfeef325",                                       // 优恩花园
                "map-place-8dfa11b221d9b429d55ac3f7",                                       // 旧日之海
                "map-place-cd34f1eebbaef66eb5e3af66",                                       // 谐律院
                "map-place-d7477c572bc5fa590e40433b",                                       // 崇高大道
                "map-place-deb14d58902667e1bfbf7a5f",                                       // 卡皮托林山
                "map-place-eb451bbbc35fefc8dc79d6ad",                                       // 雅努斯之门
                // #endregion surfaceLabels
            ],
            "places": [
                // #region places:point 地图点位
                "point-11-1",                                                               // 传送锚点
                "point-11-10",                                                              // 传送锚点
                "point-11-11",                                                              // 传送锚点
                "point-11-12",                                                              // 传送锚点
                "point-11-13",                                                              // 传送锚点
                "point-11-14",                                                              // 传送锚点
                "point-11-15",                                                              // 传送锚点
                "point-11-16",                                                              // 传送锚点
                "point-11-17",                                                              // 传送锚点
                "point-11-2",                                                               // 传送锚点
                "point-11-24",                                                              // 传送锚点
                "point-11-27",                                                              // 传送锚点
                "point-11-28",                                                              // 传送锚点
                "point-11-3",                                                               // 传送锚点
                "point-11-5",                                                               // 传送锚点
                "point-11-7",                                                               // 传送锚点
                "point-11-9",                                                               // 传送锚点
                // #endregion places:point
            ],
            "areas": [
                "world-area-560000",                                                        // 旧日之海（一级区域）
                "world-area-560001",                                                        // 雅努斯之门（二级区域）
                "world-area-560002",                                                        // 切萨勒姆宫（二级区域）
                "world-area-560003",                                                        // 安提库旧港（二级区域）
                "world-area-560004",                                                        // 优恩花园（二级区域）
                "world-area-560005",                                                        // 安息之殿（二级区域）
                "world-area-560006",                                                        // 崇高大道（二级区域）
                "world-area-560007",                                                        // 谐律院（二级区域）
                "world-area-560008",                                                        // 卡皮托林山（二级区域）
                "world-area-560009",                                                        // 黄金的大宫（二级区域）
            ],
        },
        // #endregion scene:sea_of_bygone_eras

        // #region scene:simulanka 希穆兰卡
        "simulanka": {
            "source": "scene-100",                                                          // 希穆兰卡
            // #region maskGroups 遮罩片区；仅整理查看入口，不合并条件或推断互斥。
            // 标记位置由组内每张图片的中心取算术平均，不维护手工坐标。
            "maskGroups": {
                // 地图区域 57；保留该片区的全部图像。
                "mask-area-57": [
                    "resource-atlas-c7bf11c0d145640203f52d6e",
                ],
            },
            // #endregion maskGroups
            "labels": [
                // #region labels 原生地图文字；本身不需要图标。
                "map-place-aa56fb05c9cde3389ada4dc3",                                       // 沙中故里
                "map-place-e98980b0798b0eb031448ff8",                                       // 失梦的国土
                // #endregion labels
                // #region surfaceLabels 地表及独立场景原生文字
                "map-place-6d8edc255eda0a91eb87adcd",                                       // 赐福森林
                "map-place-c80b62b49056b7a8b41d8f68",                                       // 破碎之海
                "map-place-d10d1ca95026b9122a32d528",                                       // 星轨王城
                // #endregion surfaceLabels
            ],
            "places": [
                // #region places:point 地图点位
                "point-100-11",                                                             // 传送锚点
                "point-100-12",                                                             // 传送锚点
                "point-100-13",                                                             // 传送锚点
                "point-100-14",                                                             // 传送锚点
                "point-100-15",                                                             // 传送锚点
                "point-100-16",                                                             // 传送锚点
                "point-100-17",                                                             // 传送锚点
                "point-100-2",                                                              // 传送锚点
                "point-100-20",                                                             // 传送锚点
                "point-100-3",                                                              // 传送锚点
                "point-100-31",                                                             // 传送锚点
                "point-100-4",                                                              // 传送锚点
                "point-100-5",                                                              // 传送锚点
                "point-100-6",                                                              // 传送锚点
                "point-100-7",                                                              // 传送锚点
                "point-100-8",                                                              // 传送锚点
                "point-100-9",                                                              // 传送锚点
                // #endregion places:point
            ],
            "areas": [
                "world-area-102900",                                                        // 赐福森林（一级区域）
                "world-area-102901",                                                        // 雨歌塘（二级区域）
                "world-area-102902",                                                        // 铃风王国（二级区域）
                "world-area-102903",                                                        // 赐福小屋（二级区域）
                "world-area-103000",                                                        // 星轨王城（一级区域）
                "world-area-103001",                                                        // 星轨王城（二级区域）
                "world-area-103100",                                                        // 破碎之海（一级区域）
                "world-area-103101",                                                        // 碎裂的积木矿窟（二级区域）
                "world-area-103201",                                                        // 叠架村（二级区域）
            ],
        },
        // #endregion scene:simulanka

        // #region scene:ancient_sacred_mountain 远古圣山
        "ancient_sacred_mountain": {
            "source": "scene-101",                                                          // 远古圣山
            // #region maskGroups 遮罩片区；仅整理查看入口，不合并条件或推断互斥。
            // 标记位置由组内每张图片的中心取算术平均，不维护手工坐标。
            "maskGroups": {
                // 地图区域 70；保留该片区的全部图像。
                "mask-area-70": [
                    "resource-atlas-2af8838b9d2fb8c61cabafd1",
                ],
                // 分层地图：圣山之心 / 远古圣山的龙居地；按源图层组归类，条件独立计算。
                "mask-layer-group-10180001": [
                    "resource-atlas-0e32c1f360c3b5de49debce8",
                    "resource-atlas-7a45ba92194d373be0d93fb0",
                    "resource-atlas-a1769b68646d945b7d8c9fc2",
                    "resource-atlas-b2ee63b7712ba1219aae2ba9",
                    "resource-atlas-d390bdb12f0416f7670f0af4",
                    "resource-atlas-e2639f68d5cfaba74a745668",
                    "resource-atlas-e885ea2374492919b0737431",
                ],
            },
            // #endregion maskGroups
            "labels": [
                // #region labels 原生地图文字；本身不需要图标。
                "map-place-02b0aad0c3e5f3eeb405bb4a",                                       // 支离武备所
                "map-place-0b1adc8342e9829ec7ade2f2",                                       // 力向逆心
                "map-place-198930d79e225f3aaabc5b53",                                       // 审议之庭
                "map-place-5bf61317603d767e18fc7c90",                                       // 衍术阵列
                "map-place-9a8bb4f788007c5a9afd8592",                                       // 圣山之心
                "map-place-e08e80273b6cfcc36fa7d28f",                                       // 拟星的台座
                // #endregion labels
                // #region surfaceLabels 地表及独立场景原生文字
                "map-place-5988bf1c2d7bea7b5f2460b8",                                       // 聚火祭验所
                "map-place-6b3ed02cb74f7f972adfb50b",                                       // 分流识海
                "map-place-814b7f67a9df0ab179925d9d",                                       // 大日御舆
                "map-place-93fdf8ce10dc52a09b16582f",                                       // 候召的厅堂
                "map-place-a1e04079b6344637ea150490",                                       // 蛇心之地
                "map-place-b0207c0d56022d64aa2f4596",                                       // 远古圣山
                "map-place-bf07cbfa1a065cbeefd81081",                                       // 八衢彦之地
                "map-place-dd6cff82f79f466e3f7b2b84",                                       // 八衢姬之地
                "map-place-fb5076ad9c0430a6b5c3acc5",                                       // 歧之地
                // #endregion surfaceLabels
            ],
            "places": [
                // #region places:point 地图点位
                "point-101-11",                                                             // 传送锚点
                "point-101-12",                                                             // 传送锚点
                "point-101-13",                                                             // 传送锚点
                "point-101-14",                                                             // 传送锚点
                "point-101-15",                                                             // 传送锚点
                "point-101-16",                                                             // 传送锚点
                "point-101-17",                                                             // 传送锚点
                "point-101-18",                                                             // 传送锚点
                "point-101-19",                                                             // 传送锚点
                "point-101-2",                                                              // 传送锚点
                "point-101-20",                                                             // 传送锚点
                "point-101-21",                                                             // 传送锚点
                "point-101-22",                                                             // 传送锚点
                "point-101-3",                                                              // 传送锚点
                "point-101-4",                                                              // 传送锚点
                "point-101-5",                                                              // 传送锚点
                "point-101-6",                                                              // 传送锚点
                "point-101-7",                                                              // 传送锚点
                "point-101-8",                                                              // 传送锚点
                // #endregion places:point
            ],
            "areas": [
                "world-area-680000",                                                        // 远古圣山（一级区域）
                "world-area-680001",                                                        // 候召的厅堂（二级区域）
                "world-area-680002",                                                        // 分流识海（二级区域）
                "world-area-680003",                                                        // 聚火祭验所（二级区域）
                "world-area-680004",                                                        // 审议之庭（二级区域）
                "world-area-680005",                                                        // 衍术阵列（二级区域）
                "world-area-680006",                                                        // 力向逆心（二级区域）
                "world-area-680007",                                                        // 支离武备所（二级区域）
                "world-area-680008",                                                        // 拟星的台座（二级区域）
                "world-area-680009",                                                        // 圣山之心（二级区域）
                "world-area-680010",                                                        // 未提供名称（二级区域）
                "world-area-680011",                                                        // 未提供名称（二级区域）
            ],
        },
        // #endregion scene:ancient_sacred_mountain

        // #region scene:scene-102 霜月
        "scene-102": {
            "source": "scene-102",                                                          // 霜月
            // #region maskGroups 遮罩片区；仅整理查看入口，不合并条件或推断互斥。
            // 标记位置由组内每张图片的中心取算术平均，不维护手工坐标。
            "maskGroups": {
                // 地图区域 140；保留该片区的全部图像。
                "mask-area-140": [
                    "resource-atlas-989fee3e79f94c5f6f55f21d",
                ],
                // 分层地图：乌吉恩圈·动力引擎 / 天攀艏；按源图层组归类，条件独立计算。
                "mask-layer-group-10290003": [
                    "resource-atlas-47a8977257e0d9389d0e6b7e",
                    "resource-atlas-d1ddd40d265b8617c524b5ef",
                ],
                // 分层地图：卡菈格警备场；按源图层组归类，条件独立计算。
                "mask-layer-group-10290005": [
                    "resource-atlas-4de3a6542c97e869453cf48c",
                ],
                // 分层地图：努尔寂石阵列；按源图层组归类，条件独立计算。
                "mask-layer-group-10290012": [
                    "resource-atlas-56be2025fd1a0d810615e249",
                ],
                // 分层地图：水源浮岛；按源图层组归类，条件独立计算。
                "mask-layer-group-10290009": [
                    "resource-atlas-83143a9ac0dd6da7a19959f8",
                ],
                // 分层地图：乌吉恩圈·地下洞穴；按源图层组归类，条件独立计算。
                "mask-layer-group-10290002": [
                    "resource-atlas-ce659ad7a0629e68710f0e8d",
                    "resource-atlas-d42e4fab060857afa0d4d795",
                ],
            },
            // #endregion maskGroups
            "labels": [
                // #region surfaceLabels 地表及独立场景原生文字
                "map-place-08bf35b3ecd045af2ef80d38",                                       // 努尔寂石阵列
                "map-place-191731afc9b85889a98d7253",                                       // 月之暗面
                "map-place-1ea9fc5b901c04bccadd1b1d",                                       // 乌吉恩圈
                "map-place-4a0cbb137e5bfe45682066f3",                                       // 伊比尼伯龙之眼
                "map-place-7b7d6ada17532ee02802d7f0",                                       // 月之暗面
                "map-place-8cacf90d75952126c71a8044",                                       // 幕形态黑体物质笼实验室
                "map-place-947715b7ed3bd499f6e6f5c9",                                       // 金屋
                "map-place-b41e5e2450bf84285271b690",                                       // 月荡海
                "map-place-b8475a0449cfc668c0719562",                                       // 旅者环形山
                "map-place-ce65dce715bf1ab2d099695a",                                       // 月之高地
                "map-place-cf272dbb440756675fd6171c",                                       // 古月风暴研究所
                "map-place-d66aafd28e252b7ede3f41c8",                                       // 月荡海
                "map-place-f5f3eb1f9aa5b3d7f92e4962",                                       // 浮沤泊
                // #endregion surfaceLabels
            ],
            "places": [
                // #region places:point 地图点位
                "point-102-11",                                                             // 传送锚点
                "point-102-15",                                                             // 传送锚点
                "point-102-16",                                                             // 传送锚点
                "point-102-17",                                                             // 传送锚点
                "point-102-18",                                                             // 传送锚点
                "point-102-19",                                                             // 传送锚点
                "point-102-2",                                                              // 传送锚点
                "point-102-20",                                                             // 传送锚点
                "point-102-24",                                                             // 传送锚点
                "point-102-25",                                                             // 传送锚点
                "point-102-3",                                                              // 传送锚点
                "point-102-32",                                                             // 传送锚点
                "point-102-33",                                                             // 传送锚点
                "point-102-34",                                                             // 传送锚点
                "point-102-36",                                                             // 传送锚点
                "point-102-37",                                                             // 传送锚点
                "point-102-39",                                                             // 传送锚点
                "point-102-4",                                                              // 传送锚点
                "point-102-43",                                                             // 传送锚点
                "point-102-45",                                                             // 传送锚点
                "point-102-46",                                                             // 传送锚点
                "point-102-47",                                                             // 传送锚点
                "point-102-48",                                                             // 传送锚点
                "point-102-49",                                                             // 传送锚点
                "point-102-5",                                                              // 传送锚点
                "point-102-50",                                                             // 传送锚点
                "point-102-51",                                                             // 传送锚点
                "point-102-54",                                                             // 传送锚点
                "point-102-56",                                                             // 传送锚点
                "point-102-6",                                                              // 传送锚点
                "point-102-62",                                                             // 传送锚点
                "point-102-7",                                                              // 传送锚点
                "point-102-8",                                                              // 传送锚点
                // #endregion places:point
            ],
            "areas": [
                "world-area-770000",                                                        // 月之高地（一级区域）
                "world-area-770001",                                                        // 伊比尼伯龙之眼（二级区域）
                "world-area-770002",                                                        // 乌吉恩圈（二级区域）
                "world-area-770003",                                                        // 星空生物捕捉站（二级区域）
                "world-area-770004",                                                        // 浮沤泊（二级区域）
                "world-area-770005",                                                        // 古月风暴研究所（二级区域）
                "world-area-770006",                                                        // 金屋（二级区域）
                "world-area-770007",                                                        // 玛歌的温室（二级区域）
                "world-area-770008",                                                        // 卡菈格警备场（二级区域）
                "world-area-770009",                                                        // 乌吉恩圈·动力引擎（二级区域）
                "world-area-770010",                                                        // 奔月者号（二级区域）
                "world-area-770011",                                                        // 努尔寂石阵列（二级区域）
                "world-area-770012",                                                        // 望月者号（二级区域）
                "world-area-770013",                                                        // 旅者环形山（二级区域）
                "world-area-770100",                                                        // 月荡海（一级区域）
                "world-area-770101",                                                        // 幕形态黑体物质笼实验室（二级区域）
                "world-area-770200",                                                        // 月之暗面（一级区域）
                "world-area-770201",                                                        // 月心罅隙（二级区域）
            ],
        },
        // #endregion scene:scene-102

        // #region scene:temple_of_space 空之神殿
        "temple_of_space": {
            "source": "scene-103",                                                          // 空之神殿
            // #region maskGroups 遮罩片区；仅整理查看入口，不合并条件或推断互斥。
            // 标记位置由组内每张图片的中心取算术平均，不维护手工坐标。
            "maskGroups": {
                // 地图区域 110、111、112、113、114；同场景内相交的覆盖图；分别保留显示条件。
                "mask-area-110-111-112-113-114": [
                    "resource-atlas-e9535e4088bb3b7cc29d59bd",
                    "resource-atlas-9d203e7ecd5f24c4b0a29957",
                    "resource-atlas-09584c051ba73c2f96c7456b",
                    "resource-atlas-f5a556f61422c01fae1b9d66",
                    "resource-atlas-24a431e690e9405def4e9661",
                ],
                // 分层地图：沙上楼阁·倒影；按源图层组归类，条件独立计算。
                "mask-layer-group-7": [
                    "resource-atlas-01d48d536e19e5b89c6e2173",
                ],
                // 分层地图：无想之间；按源图层组归类，条件独立计算。
                "mask-layer-group-2": [
                    "resource-atlas-16ef06152310410ff753963a",
                ],
                // 分层地图：大方广之间·图书馆二层 / 大方广之间·图书馆一层；按源图层组归类，条件独立计算。
                "mask-layer-group-6": [
                    "resource-atlas-5c200f036c6ee25b142c07d0",
                    "resource-atlas-613a750e5a6f9781d14f844e",
                    "resource-atlas-7572c618653b15a1964a05a2",
                    "resource-atlas-c7b4e567bdd0119f988aec8a",
                    "resource-atlas-ddaf19a0ac0bfe21b5276dc9",
                    "resource-atlas-e9863ab54af5f43202934a7b",
                ],
            },
            // #endregion maskGroups
            "labels": [
                // #region labels 原生地图文字；本身不需要图标。
                "map-place-0732619295418bf9250c3667",                                       // 沙中故里
                "map-place-2d1d5463e5eea0c85b09cb2f",                                       // 无想之间
                "map-place-38783b8ab7cb12e231b36c0a",                                       // 遗世之路
                "map-place-3d5cb89a370da80a479f891e",                                       // 非有非无有之笼
                "map-place-424b629a422aa75741e5aeb4",                                       // 失梦的国土
                "map-place-5148f2031e566b98f73f0caa",                                       // 失梦的国土
                "map-place-54b2cabb571c8b12e111ae17",                                       // 失梦的国土
                "map-place-653851628ccacaf459db0434",                                       // 失梦的国土
                "map-place-827e11a16d0fe8dc1ca27b0a",                                       // 沙中故里
                "map-place-93465ed44de3e8471c6cca64",                                       // 失梦的国土
                "map-place-99f684abd2ba000442100d77",                                       // 沙中故里
                "map-place-a9f262f2fb826576eb9432cc",                                       // 失梦的国土
                "map-place-cb4af5e8e960396465e73886",                                       // 沙中故里
                "map-place-d3edcb357ab4d2d33535400e",                                       // 沙中故里
                // #endregion labels
                // #region surfaceLabels 地表及独立场景原生文字
                "map-place-236d77892e674045c510fbc1",                                       // 遗世之路
                "map-place-3ad2de73863857b6f9065404",                                       // 柱殿中央区
                "map-place-52a506bfc099bc0dd5425813",                                       // 空之神殿
                "map-place-7b921e1cdb08a550fa2bc5d6",                                       // 大方广
                "map-place-7bcd1da66f1e9653fffc3e39",                                       // 无想之间
                "map-place-9892d914e01400c845a87eaf",                                       // 非有非无有之笼
                "map-place-b02887fa5172b07d7e279d93",                                       // 「沙上楼阁」
                "map-place-d925be2995cd3689b29d3935",                                       // 麓阳书院
                // #endregion surfaceLabels
            ],
            "places": [
                // #region places:point 地图点位
                "point-103-1",                                                              // 传送锚点
                "point-103-10",                                                             // 传送锚点
                "point-103-11",                                                             // 传送锚点
                "point-103-13",                                                             // 传送锚点
                "point-103-15",                                                             // 传送锚点
                "point-103-16",                                                             // 传送锚点
                "point-103-17",                                                             // 传送锚点
                "point-103-18",                                                             // 传送锚点
                "point-103-19",                                                             // 传送锚点
                "point-103-2",                                                              // 传送锚点
                "point-103-20",                                                             // 传送锚点
                // "point-103-22",                                                             // 秘境入口
                "point-103-25",                                                             // 传送锚点
                "point-103-26",                                                             // 传送锚点
                "point-103-3",                                                              // 传送锚点
                "point-103-4",                                                              // 传送锚点
                "point-103-5",                                                              // 传送锚点
                "point-103-6",                                                              // 传送锚点
                "point-103-7",                                                              // 传送锚点
                "point-103-8",                                                              // 传送锚点
                "point-103-9",                                                              // 传送锚点
                // #endregion places:point
            ],
            "areas": [
                "world-area-10700",                                                         // 空之神殿（一级区域）
                "world-area-10701",                                                         // 柱殿中央区（二级区域）
                "world-area-10702",                                                         // 大方广（二级区域）
                "world-area-10703",                                                         // 麓阳书院（二级区域）
                "world-area-10704",                                                         // 「沙上楼阁」（二级区域）
                "world-area-10705",                                                         // 无想之间（二级区域）
                "world-area-10706",                                                         // 非有非无有之笼（二级区域）
                "world-area-10707",                                                         // 遗世之路（二级区域）
                "world-area-10708",                                                         // 无所有廊（二级区域）
                "world-area-10709",                                                         // （test）初始海滩（二级区域）
                "world-area-10710",                                                         // （test）心灵空间（二级区域）
                "world-area-10711",                                                         // （test）无限回廊（二级区域）
                "world-area-10712",                                                         // 非有非无有之笼·偏观（二级区域）
                "world-area-10713",                                                         // 「沙上楼阁」（二级区域）
            ],
        },
        // #endregion scene:temple_of_space

    },
};

export default data;
