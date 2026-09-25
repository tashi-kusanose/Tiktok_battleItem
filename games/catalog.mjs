export const GAMES=[
 {id:'question',set:'talk',icon:'✦',name:'質問ガチャ',desc:'みんなの回答から話を広げる',tag:'回答',prompt:'最近買ってよかったものは？',samples:['最近いちばん笑ったことは？','1週間休めるなら何をする？','子どもの頃に信じていたことは？','自分の小さなこだわりを教えて','今いちばん食べたいものは？','人生で一度はやってみたいことは？','もし1つ能力をもらえるなら？']},
 {id:'either',set:'talk',icon:'◐',name:'究極の2択',desc:'AかBを選んで、その理由を話そう',tag:'投票',prompt:'もし選ぶなら、どっち？',options:['過去に1回戻れる','未来を1回見られる'],samples:[['一生夏だけ','一生冬だけ'],['旅行はひとり','旅行は大人数'],['毎日同じ好物','毎日初めての料理'],['空を飛べる','瞬間移動できる']]},
 {id:'ranking',set:'talk',icon:'♛',name:'みんなのランキング',desc:'1人1票で、この枠のBEST3を決める',tag:'投票',prompt:'いちばん好きなおにぎりの具は？',options:['鮭','ツナマヨ','梅','昆布','明太子']},
 {id:'comment',set:'talk',icon:'☏',name:'コメントお題',desc:'ひとこと回答を、みんなで眺める',tag:'回答',prompt:'今の気分を絵文字1個で！',samples:['私を漢字1文字で表すと？','この枠を色で表すと何色？','今日食べたものを1つだけ！','最近ハマっているものは？','この配信にタイトルを付けるなら？']},
 {id:'mission',set:'talk',icon:'⚑',name:'みんなのミッション',desc:'できたらタップ。達成人数を共有',tag:'達成報告',prompt:'今の自分に「おつかれさま」と言ってみよう',samples:['お水をひとくち飲もう','肩をゆっくり回してリラックス','今日のよかったことを1つ思い出そう','配信コメントに好きな絵文字を1つ送ろう']},
 {id:'random',set:'talk',icon:'⤨',name:'全部ランダム',desc:'5つの雑談ゲームからおまかせ',tag:'おまかせ'},
 {id:'bingo',set:'kazz',icon:'▦',name:'みんなでビンゴ',desc:'それぞれのカードで数字を開こう',tag:'カード操作',prompt:'呼ばれた数字をタップ！縦・横・斜めでビンゴ'},
 {id:'roulette',set:'kazz',icon:'◉',name:'ルーレット',desc:'次の曲やお題をルーレットで決定',tag:'結果共有',prompt:'次は何をする？',options:['1曲歌う','質問タイム','近況トーク','ものまね']},
 {id:'gacha',set:'kazz',icon:'◈',name:'ガチャガチャ',desc:'1人1回。何が出るかお楽しみ',tag:'抽選操作',prompt:'今日のあなたの称号は？',options:['伝説の常連','癒やしの天才','トークの相棒','今日の主役'],weights:[10,40,40,10]},
 {id:'lottery',set:'kazz',icon:'☆',name:'参加者抽選',desc:'参加者から順に、重複なしで抽選',tag:'抽選対象',prompt:'今日のラッキーリスナーは？'},
 {id:'quiz',set:'kazz',icon:'?',name:'4択クイズ',desc:'回答を締め切って正解を発表',tag:'回答',prompt:'1年のうち、30日で終わる月はいくつ？',options:['3つ','4つ','5つ','6つ'],correct:1},
 {id:'slot',set:'kazz',icon:'▥',name:'スロット',desc:'1人1回。3つ揃えば大当たり',tag:'抽選操作',prompt:'スロットで運試し！3つ揃えば大当たり'},
 {id:'cards',set:'kazz',icon:'▣',name:'カードめくり',desc:'共有の6枚から、1人1枚を選ぼう',tag:'選択操作',prompt:'好きな番号を選ぼう！1人1枚・同じカードは選べません',options:['歌を1曲','質問タイム','スクショタイム','ものまね','次のお題を決める','大当たり']},
 {id:'treasure',set:'kazz',icon:'◇',name:'宝箱',desc:'6つの宝箱、どこに当たりがある？',tag:'選択操作',prompt:'宝箱を選んで開けよう！1人1つ・開封済みは選べません',options:['大当たり','セーフ','セーフ','セーフ','セーフ','セーフ']}
];
export const getGame=id=>GAMES.find(g=>g.id===id);
export const pick=items=>items[Math.floor(Math.random()*items.length)];
export function defaults(g){return {prompt:g.prompt,options:g.options?.map((label,i)=>({label,weight:g.weights?.[i]||1})),correct:g.correct??0};}
export const HANDS=['✊ グー','✌ チョキ','✋ パー'];
export const winsRps=(player,hand)=>(player+1)%3===hand;
export function bingoLines(card,marks){
 const set=new Set([0,...marks]), lines=[];
 for(let i=0;i<5;i++){lines.push(Array.from({length:5},(_,j)=>card[i*5+j]));lines.push(Array.from({length:5},(_,j)=>card[j*5+i]));}
 lines.push([0,6,12,18,24].map(i=>card[i]),[4,8,12,16,20].map(i=>card[i]));
 return {bingo:lines.some(l=>l.every(v=>set.has(v))),reach:lines.filter(l=>l.filter(v=>!set.has(v)).length===1).length};
}
