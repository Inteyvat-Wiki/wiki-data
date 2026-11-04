// 地图状态使用的任务步骤前驱关系；from 的完成先于 to 的完成。
// 跨任务边可能来自完成条件，不能仅因 to 正在进行就认定 from 已完成。
// task 是 tasks.js 中维护的导出键；step 是任务页面的步骤 id（从 1 开始），不是原始子任务 ID。
// 同任务按导出步骤 id 升序建立默认依赖，因此只需手工维护跨任务边。
// 注释仅供维护，不导出为游戏条件文案。这里的先后关系不代表遮罩的显隐规则。
// 暂只覆盖现有任务导出目录；新版尚未导出的任务不猜造键名或步骤编号。
/** @type {import('./data').MapTaskDependencies} */
const data = {
    schema: 1,
    sameTaskOrder: 'ascending',
    edges: [
        // 已核对：要求特别多的作家第 22/25/28 步的完成条件分别等待三个隐藏任务的末步完成。
        // 隐藏任务的地图状态写入在各自更早步骤，默认同任务顺序会把它们接入这条链。
        { from: { task: 'quest_72225', step: 7 }, to: { task: 'a_particularly_particular_author', step: 22 } },
        { from: { task: 'quest_72226', step: 7 }, to: { task: 'a_particularly_particular_author', step: 25 } },
        { from: { task: 'quest_72227', step: 8 }, to: { task: 'a_particularly_particular_author', step: 28 } },

        // 已核对：前一任务末步初始化时间变量 0，后一任务第 1 步等待该任务的时间变量跨日。
        // 只记录必要的先后关系，不把“已完成前驱”当成跨日等待已满足。
        { from: { task: 'a_particularly_particular_author', step: 39 }, to: { task: 'octave_of_the_maushiro', step: 1 } },
        { from: { task: 'octave_of_the_maushiro', step: 53 }, to: { task: 'the_sea_of_fog_and_the_rite_of_the_trees', step: 1 } },
        { from: { task: 'the_sea_of_fog_and_the_rite_of_the_trees', step: 31 }, to: { task: 'the_sunwheel_and_mt_kanna', step: 1 } },

        // 人工推断：原始后续任务指向“埋葬丰饶的沙丘·下”，以“中”的结束步骤连接“下”的起点。
        // 用于排序区域状态写入；后续任务指向本身不是完整的接取条件。
        { from: { task: 'duneentombed_fecundity_part_ii', step: 51 }, to: { task: 'duneentombed_fecundity_part_iii', step: 1 } },

        // 人工推断：原始后续任务链为 幽暗时分 → 妄念与真知的通天塔 → 虚空劫灰往世书。
        // 保留中间任务节点，避免把两个写入动作直接误称为游戏原始前置条件。
        { from: { task: 'darkness_looming', step: 24 }, to: { task: 'a_tower_unto_wisdom_and_folly', step: 1 } },
        { from: { task: 'a_tower_unto_wisdom_and_folly', step: 27 }, to: { task: 'truth_amongst_the_pages_of_purana', step: 1 } },
    ],
};

export default data;
