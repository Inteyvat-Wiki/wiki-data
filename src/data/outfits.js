// Wiki IDs are maintained here; values are stable genshin-db source IDs.
// Nested objects form one list entry; their item IDs, texts and images stay independent.
/** @type {import('./data').OutfitDirectory} */
const data = {
    // <outfit-directory:character>
    character: {
        "flawless_radiance": 200200, // 莹辉流华（Kamisato Ayaka）
        "springbloom_missive": 200201, // 花时来信（Kamisato Ayaka）
        "favonian_devotion": 200300, // 风之虔护（Jean）
        "sea_breeze_dandelion": 200301, // 海风之梦（Jean）
        "gunnhildrs_legacy": 200302, // 古恩希尔德的传承（Jean）
        "rising_star_aether": 200500, // 初升之星（Aether）
        "as_heaven_and_earth_are_made_anew_aether": 200501, // 复地重天（Aether）
        "purple_rose": 200600, // 绀紫蔷薇（Lisa）
        "a_sobriquet_under_shade": 200601, // 叶隐芳名（Lisa）
        "rising_star_lumine": 200700, // 初升之星（Lumine）
        "as_heaven_and_earth_are_made_anew_lumine": 200701, // 复地重天（Lumine）
        "innocent_longing": 201400, // 纯真期待（Barbara）
        "summertime_sparkle": 201401, // 闪耀协奏（Barbara）
        "icy_featherflight": 201500, // 冰上飞羽（Kaeya）
        "sailwind_shadow": 201501, // 帆影游风（Kaeya）
        "darknight_blaze": 201600, // 夜行暗火（Diluc）
        "red_dead_of_night": 201601, // 殷红终夜（Diluc）
        "wild_sprint": 202000, // 奔行原野（Razor）
        "5_star_outrider": 202100, // 「满分的侦察骑士」（Amber）
        "100_outrider": 202101, // 100%侦察骑士（Amber）
        "breezy_ode": 202200, // 青风结诗（Venti）
        "red_pepper_and_turmeric": 202300, // 椒红姜黄（Xiangling）
        "new_years_cheer": 202301, // 岁夜欢哗（Xiangling）
        "rolling_waves": 202400, // 赫浪连涛（Beidou）
        "azure_silk": 202500, // 锦钰兰衫（Xingqiu）
        "bamboo_rain": 202501, // 雨化竹身（Xingqiu）
        "endurer_of_eons": 202600, // 千秋竞岁（Xiao）
        "gold_leaf_and_pearly_jade": 202700, // 玑玉琼金（Ningguang）
        "orchids_evening_gown": 202701, // 纱中幽兰（Ningguang）
        "shooting_spark": 202900, // 轻灵火花（Klee）
        "blossoming_starlight": 202901, // 琪花星烛（Klee）
        "hermit_of_mortal_life": 203000, // 凡世致身（Zhongli）
        "dunkelnacht_sakrament": 203100, // 绮夜圣礼（Fischl）
        "ein_immernachtstraum": 203101, // 极夜真梦（Fischl）
        "fortunes_favor": 203200, // 噩运绕行（Bennett）
        "adventures_in_blazing_hue": 203201, // 炽绘奇旅（Bennett）
        "blades_of_glory": 203300, // 荣光之刃（Tartaglia）
        "armored_rose": 203400, // 甲铁玫瑰（Noelle）
        "summerchill_dreams": 203500, // 夏冰梦身（Qiqi）
        "pure_spirit": 203600, // 清正灵台（Chongyun）
        "frostdew_trail": 203700, // 霜麟聚露（Ganyu）
        "twilight_blossom": 203701, // 玄玉瑶芳（Ganyu）
        "newmoon_starlight": 203800, // 朔分星芒（Albedo）
        "sugary_brew": 203900, // 粉糖青酿（Diona）
        "flowing_fate": 204100, // 星命流转（Mona）
        "pact_of_stars_and_moon": 204101, // 星与月之约（Mona）
        "piercing_thunderbolt": 204200, // 雷雳寰宇（Keqing）
        "opulent_splendor": 204201, // 霓裾翩跹（Keqing）
        "germinating_wind": 204300, // 萌生的灵风（Sucrose）
        "ardent_soul": 204400, // 灵魂热望（Xinyan）
        "executors_thorns": 204500, // 处刑棘刺（Rosaria）
        "to_the_churchs_free_spirit": 204501, // 致教会自由人（Rosaria）
        "plum_blossom_bouquet": 204600, // 折梅留芳（Hu Tao）
        "cherries_snow_laden": 204601, // 宿雪桃红（Hu Tao）
        "falling_leaves": 204700, // 叶落天涯（Kaedehara Kazuha）
        "golden_rule": 204800, // 金科赤律（Yanfei）
        "goldfish_firecracker": 204900, // 金鱼花火（Yoimiya）
        "warrior_of_flame": 205000, // 焰之赤武（Thoma）
        "wavecrest_waltz": 205100, // 浪尖之舞（Eula）
        "narukamis_law": 205200, // 御建鸣神主尊之典（Raiden Shogun）
        "mini_mujina": 205300, // 小貉服（Sayu）
        "sparkling_coralbone": 205400, // 珊骨粼波（Sangonomiya Kokomi）
        "panoply_of_a_hundred_hunts": 205500, // 百狩之义铠（Gorou）
        "solemn_purity": 205600, // 严正净衣（Kujou Sara）
        "eccentric_oni": 205700, // 倾奇狂鬼（Arataki Itto）
        "mikos_instruction": 205800, // 御子之谕（Yae Miko）
        "spirited_valor": 205900, // 弁武朝风（Shikanoin Heizou）
        "the_waning_point": 206000, // 于阑珊处（Yelan）
        "tranquil_banquet": 206001, // 静暇雅宴（Yelan）
        "whirling_bloom": 206100, // 百花戏（Kirara）
        "phantom_in_boots": 206101, // 倩影游侠（Kirara）
        "machine_hunter": 206200, // 机动猎手（Aloy）
        "the_worlds_shackles": 206300, // 缚绝红尘（Shenhe）
        "frostflower_dew": 206301, // 冷花幽露（Shenhe）
        "mistcloud_stage": 206400, // 氍毹烟云（Yun Jin）
        "aratakis_demonic_deputy": 206500, // 荒泷鬼副手（Kuki Shinobu）
        "silk_splendor": 206600, // 绫罗锦绣（Kamisato Ayato）
        "a_new_leaf": 206700, // 一叶新生（Collei）
        "i_love_mora": 206800, // 我爱摩拉（Dori）
        "woodland_song": 206900, // 森林之歌（Tighnari）
        "neither_flower_nor_mist": 207000, // 非花非雾（Nilou）
        "breeze_of_sabaa": 207001, // 莎邦之息（Nilou）
        "heart_of_the_scales": 207100, // 衡断之心（Cyno）
        "desert_and_night": 207200, // 沙漠与夜（Candace）
        "for_all_knowledge_a_verse": 207300, // 万识一偈（Nahida）
        "dreaming_star": 207400, // 梦里星（Layla）
        "a_wrathful_void": 207500, // 寂忿空相（Wanderer）
        "pristine_elegance": 207600, // 碧叶素华（Faruzan）
        "cherubic_osmanthus": 207700, // 栗蕊木樨花（Yaoyao）
        "rainlit_bamboo_reverie": 207701, // 聆雨听竹（Yaoyao）
        "the_rational": 207800, // 崇理者（Alhaitham）
        "the_lioness_and_the_blazing_sun": 207900, // 狮与赤阳（Dehya）
        "soaring_beacon": 208000, // 高飞信标（Mika）
        "gold_pinions_in_flames_bathed": 208100, // 浴火的金羽（Kaveh）
        "the_applications_of_medicine": 208200, // 君臣佐使（Baizhu）
        "phantomeow": 208300, // 魅影猫（Lynette）
        "fantasticat": 208400, // 幻戏猫（Lyney）
        "icy_skin": 208500, // 冰的肌肤（Freminet）
        "nights_chilling_howl": 208600, // 凛冬夜啸（Wriothesley）
        "clear_adjudication": 208700, // 澄流正裁（Neuvillette）
        "melusent_gift": 208701, // 莘露的赠礼（Neuvillette）
        "all_is_overt_through_my_lens": 208800, // 「皆在镜前」（Charlotte）
        "hurlock_variations": 208801, // 赫尔洛克变奏曲（Charlotte）
        "coronated_prima_donna": 208900, // 冠笄伶优（Furina）
        "guardians_gun": 209000, // 守正之枪（Chevreuse）
        "yellow_velvet_salon": 209100, // 黄丝绒沙龙（Navia）
        "ranging_rainbow": 209200, // 万里飞虹（Gaming）
        "a_guests_august_omen": 209300, // 有客来仪（Xianyun）
        "plucked_yamabuki_splendor": 209400, // 拈来山吹虹（Chiori）
        "sweetness_of_the_sea": 209500, // 大海的甜色（Sigewinne）
        "moonglare": 209600, // 月光（Arlecchino）
        "golden_sandstrider": 209700, // 金沙行者（Sethos）
        "sword_of_honor": 209800, // 荣光之剑（Clorinde）
        "ambrosial_verdance": 209900, // 芳草馥奇（Emilie）
        "tawny_peaks_spired_rock": 210000, // 橙峰螺岩（Kachina）
        "eight_bit_artistry": 210100, // 八位艺术（Kinich）
        "flying_fish_heat_waves_and_moon_scallop": 210200, // 飞鱼、热浪和月亮贝（Mualani）
        "gold_draped_gorge": 210300, // 澄金抹壑（Xilonen）
        "tlalocans_night_phantom": 210400, // 特拉洛坎夜幽灵（Chasca）
        "batwing_iris": 210500, // 服翼之眼（Ororon）
        "undying_sun": 210600, // 不蚀日（Mavuika）
        "dawnseer": 210700, // 启明视（Citlali）
        "whispers_of_stars_and_smoke": 210701, // 星与烟帷的夜语（Citlali）
        "argent_chimes": 210800, // 银铛琳琅（Lan Yan）
        "dawnbreath_dreambelle": 210900, // 晞吹卷梦（Yumemizuki Mizuki）
        "warriors_bonegarb": 211000, // 勇士之骨（Iansan）
        "sugar_rush": 211100, // 糖分欢意（Varesa）
        "sorbet_honey_pie": 211200, // 雪酪蜜派（Escoffier）
        "whistledart_wings": 211300, // 镖翼飞哨（Ifa）
        "shattered_star": 211400, // 碎星（Skirk）
        "pristine_prayers": 211500, // 无瑕祷言（Dahlia）
        "mechanical_dreams": 211600, // 机械梦（Ineffa）
        // "default_outfit_manekin": 211700, // 默认时装（Manekin）；无描述的默认衣装占位，不单独发布
        // "default_outfit_manekina": 211800, // 默认时装（Manekina）；无描述的默认衣装占位，不单独发布
        "verdant_moon": 211900, // 蔓菁纯月（Lauma）
        "nocturne": 212000, // 夜想曲（Flins）
        "fluffy_puffy_whiz_kid_workwear": 212100, // 蓬蓬天才工作服（Aino）
        "emerald_cipher": 212200, // 翠谜（Nefer）
        "a_gift_from_the_stars": 212300, // 星光的赠礼（Durin）
        "toward_the_distant_horizon": 212301, // 故事的远方（Durin）
        "novas_whisper": 212400, // 崭星游影（Jahoda）
        "moonweave_gossamer": 212500, // 织月裁光（Columbina）
        "moonlit_courser": 212600, // 白驹邀月（Zibai）
        "steadfast_resolve": 212700, // 不懈执望（Illuga）
        "oath_to_the_north_wind": 212800, // 北风起誓（Varka）
        "frost_forged_edge": 212900, // 霜铸之锐（Lohen）
        "lone_feathers_omen": 213000, // 孤羽成谶（Linnea）
        "mimetic_interpretation": 213100, // 解喻拟装（Nicole）
        "witch_hunter_regalia": 213200, // 魔女猎装（Prune）
        "clockwork_maidens_waltz": 213300, // 发条与淑女与圆舞曲（Sandrone）
        // "default_outfit_traveler": 213400, // 默认时装（Traveler）；无描述的默认衣装占位，不单独发布
        // "default_outfit_traveler-213500": 213500, // 默认时装（Traveler）；无描述的默认衣装占位，不单独发布
        "logical_leap": 213600, // 理析阶跃（Mitya）
        "steel_and_sash": 213700, // 钢铁与绶带（Valeriy）
        "surging_resonance": 214000, // 溯涌遗韵（Vodyanitsa）
        "springs_bond_winters_oath": 214300, // 春结冬契（Vesna）
        "frost_cloaked_ambusher": 214800, // 寒帷伏猎（Alyosha）
        "snow_swans_dance": 215000, // 雪鹄之舞（Odette）
        // "default_outfit_mavuika_trial": 290100, // 默认时装（Mavuika (Trial)）；无描述的默认衣装占位，不单独发布
        // "default_outfit_hu_tao_trial": 290200, // 默认时装（Hu Tao (Trial)）；无描述的默认衣装占位，不单独发布
        // "default_outfit_ineffa": 290300, // 默认时装（Ineffa）；无描述的默认衣装占位，不单独发布
        // "default_outfit_columbina": 290400, // 默认时装（Columbina）；无描述的默认衣装占位，不单独发布
        // "default_outfit_ugc_official_male": 299800, // 默认时装（UGC (Official Male)）；无描述的默认衣装占位，不单独发布
        // "default_outfit_ugc_official_female": 299900, // 默认时装（UGC (Official Female)）；无描述的默认衣装占位，不单独发布
    },
    // </outfit-directory:character>
    // <outfit-directory:weapon>
    weapon: {
        "serpent_devourer": {
            "serpent_devourer": 310001, // 蛇噬
            "serpent_devourer_sublimation": 310002, // 蛇噬·真化
        },
        "golden_bough_of_nemorensis": {
            "golden_bough_of_nemorensis": 310003, // 涅墨林塞的金枝
            "golden_bough_of_nemorensis_sublimation": 310004, // 涅墨林塞的金枝·真化
        },
        "ardent_storm": {
            "ardent_storm": 320001, // 赫烈
            "ardent_storm_sublimation": 320002, // 赫烈·真化
        },
        "silver_radiance_of_gradlon": {
            "silver_radiance_of_gradlon": 320003, // 贾尔杜莱的银辉
            "silver_radiance_of_gradlon_sublimation": 320004, // 贾尔杜莱的银辉·真化
        },
        "shattered_moon": {
            "shattered_moon": 330001, // 碎月
            "shattered_moon_sublimation": 330002, // 碎月·真化
        },
        "starlight_of_fylkir": {
            "starlight_of_fylkir": 330003, // 芬里基亚的星芒
            "starlight_of_fylkir_sublimation": 330004, // 芬里基亚的星芒·真化
        },
        "hallowed_fetters": {
            "hallowed_fetters": 340001, // 圣缚
            "hallowed_fetters_sublimation": 340002, // 圣缚·真化
        },
        "dawnstar_of_shahar": {
            "dawnstar_of_shahar": 340003, // 撒哈律尔的曙星
            "dawnstar_of_shahar_sublimation": 340004, // 撒哈律尔的曙星·真化
        },
        "starpiercer": {
            "starpiercer": 350001, // 贯星
            "starpiercer_sublimation": 350002, // 贯星·真化
        },
        "yayu": {
            "yayu": 350003, // 猰貐
            "yayu_sublimation": 350004, // 猰貐·真化
        },
        "phantasmal_gift_star_omen": 380001, // 幻礼·星兆
        "super_awesome_magic_key": 380002, // 「超厉害魔法钥匙」
        "a_touch_of_frost_in_scorching_summer": 380003, // 炎夏轻霜！
        "unbreakable_durandarte": 390001, // 无毁·督兰嘉德
        "exaiphanes_blade-0": {
            "exaiphanes_blade-0": 390002, // 星锋剑（旅行者专用）
            "exaiphanes_blade-1": 390003, // 星锋剑（赠予朋友）
        },
    },
    // </outfit-directory:weapon>
    // <outfit-directory:glider>
    glider: {
        "wings_of_first_flight": 140001, // 初始之翼
        "wings_of_companionship": 140002, // 守候之翼
        "wings_of_descension": 140003, // 降临之翼
        "wings_of_azure_wind": 140004, // 苍天清风之翼
        "wings_of_golden_flight": 140005, // 金琮天行之翼
        "wings_of_concealing_snow": 140006, // 雪隐之翼
        "wings_of_feasting": 140007, // 飨宴之翼
        "wings_of_the_stormstrider": 140008, // 雷腾云奔之翼
        "wings_of_shimmering_galaxy": 140009, // 星汉灿烂之翼
        "wings_of_the_forest": 140010, // 森郁花繁之翼
        "wings_of_the_starlit_feast": 140011, // 星筵之翼
        "wings_of_merciful_wrathful_waters": 140012, // 慈水怒涛之翼
        "wings_of_transient_dreams": 140013, // 梦生须臾之翼
        "wings_of_delicacies": 140014, // 肴馔之翼
        "wings_of_soaring_flame": 140015, // 烈火腾燎之翼
        "wings_of_fates_course_intertwined": 140016, // 命轨爻错之翼
        "wings_of_the_silent_moon": 140017, // 夜驻月停之翼
        "wings_of_leisurely_moments": 140018, // 暇生一聚之翼
        "wings_of_starry_winterfrost": 140019, // 星苍冬凌之翼
    },
    // </outfit-directory:glider>
};

export default data;
