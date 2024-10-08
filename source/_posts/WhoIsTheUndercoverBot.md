---
title: 🕵️‍ WhoIsTheUndercoverBot
title_url: who-is-the-under-cover-bot
type: blog
date: 2021-11-23
updated: 2021-12-13
tags: 

categories:

big_cover: 
small_cover: 
mark: 60
---
# 🕵️‍ WhoIsTheUndercoverBot
> 谁是卧底？

 

> 谁是卧底？

WhoIsTheUndercoverBot 是一个 RocketChat机器人。它可以帮助你主持一局”谁是卧底“游戏。

# 使用方法

机器人加入了一个公开的频道，所有的玩家都要加入这个频道，才可以正常创建/加入游戏。

## 命令

- `/创建游戏 xxx` 创建一场游戏，名字叫做xxx，然后你就成为了一场游戏的创建者。
- `/加入游戏 xxx` 加入游戏xxx
- `/退出游戏` 退出任何一场已经加入的游戏。
- `/取消游戏 xxx` 取消一场游戏，只有创建者才能取消自己的游戏。
- `/所有游戏` 列出服务器上运行的所有游戏。
- `/开始游戏 xxx` 开始一场游戏。只有创建者才能开始自己的游戏。

以上命令只能在游戏频道里发送，私聊或者其他区域发送无效。

## 概念

每局游戏游戏有三个状态：准备中、进行中和已完成。 玩家只能退出、加入准备中的游戏，只能取消准备中和已完成的游戏。
玩家不能够创建同名的游戏。注意：游戏完成之后，群组不会立刻解散，所以游戏名字不会变得立刻可用，需要房主主动取消这局游戏后，房间解散，游戏名字才会重新变得可用。

游戏的创建者和游戏的参与者在一局游戏中的身份没有任何区别。判定胜负、发放身份和词汇等操作都由机器人自动完成，玩家只需要参与游戏即可。

机器人本身是CGI服务器，每个独立的游戏都互不影响的运行在一个单独的线程中。

有关“谁是卧底”游戏的具体玩法，请参考文章中“游戏规则”的介绍。

## 流程

当一个游戏创建成功之后，机器人就会打开一个新的私密群组，群组名字就是游戏的名字，群组的成员是创建一局游戏的成员。

每当有用户希望加入游戏时，机器人就会将他添加到群组中，反之，当用户希望退出一个游戏时，机器人就会将他从群组中移除。 同时，机器人会和刚刚加入的用户建立会话窗口，但是机器人不会主动关闭窗口。

当创建者取消一个游戏的时候，对应的群组会被立即解散。

创建者开始游戏之后，机器人会对已经加入的玩家进行排序、编号，然后向每个玩家发送一个词和对应的玩家编号。同时，机器人会在新创建的游戏群中发送“游戏开始”，并提示发言顺序，玩家需要注意是否轮到自己发言了。

游戏进行中，请玩家时刻注意是否需要轮到自己行动，发言请尽量一句话描述，投票的时候请输入对应玩家的编号。如此发言-投票直到一局游戏结束。

如果游戏胜负的判定条件达成，机器人会决定游戏结束，并宣布游戏结果。游戏结束之后，游戏群不会立即关闭，玩家可以自由退出，不受限制。

玩家当然可以在一局游戏结束之后立即加入或者创建一局新的游戏。

# 游戏规则
有关“谁是卧底”游戏，并没有统一的游戏规则，因此在这里我们使用“谁是卧底 - Neboer版规则”进行游戏。

- 每局游戏最少3人参与。但是推荐4人以上，3人确实感觉没什么意思。
- 每局游戏中有两个身份——平民和卧底。二者拿到的初始词汇不同。机器人会随机从卧底词库中选择词汇，词汇完全随机挑选，玩家不需要做任何设置。
- 每局游戏由若干“轮次”组成，每轮次又分为“发言阶段”和“投票阶段”两个阶段。
- 在一个轮次中，玩家需要先发言，描述自己并尽可能根据别人的描述确定别人的身份，隐藏自己，寻找队友。当所有玩家发言结束后开始投票，投票的顺序是发言顺序的逆序，也就是最后发言的人需要最先投票。
- 每轮次游戏中都要淘汰一名玩家。每轮次游戏中得票最高的玩家被投出。如果有玩家平票，则平票的玩家需要单独额外的陈述，然后再次进行一轮所有玩家的投票。
- 当一个轮次结束之后，得票最高的玩家会被投出。此时，这位玩家虽然还在群组之中，但是他已经不属于任何一局游戏了，它不能够参与投票，但是仍然可以发言。他可以加入其他的游戏，也可以创建其他游戏，没有任何限制。
- 一个玩家被投出之后，系统会自动计算场上的卧底和平民的数量。当
    - 卧底数 = 0： 平民胜利
    - 如果游戏只有三人参与，那么投出卧底->平民胜利；投出平民->卧底胜利。
    - 如果游戏参与人数大于三人：
      - 卧底数 ≥ (平民数-1)。如2平民1卧底，卧底胜利。
      - 不满足上述条件，继续下一轮次。
- 当某个轮次结束之后，系统判断某类玩家胜利，会宣布游戏结果，并结束当前游戏。

# 玩家守则

1. 房间名字只能由中文字符、字母或者数字组成，不能包含空格、特殊符号或非CJK、非ASCII的字符，长度不要超过10个*字符*。
2. 在没有轮到某位玩家发言的时候，这位玩家可以发言，但是请不要刷屏、聊天或发送与游戏无关的内容，会影响其他玩家的游戏体验。
3. 玩家不应该退出正在进行中的游戏房间，更不应该在游戏中挂机，长时间不发送消息。如果有玩家如此操作，房主可以将对应玩家的id报告给管理员，管理员会对恶意游戏的玩家进行处理。每局游戏的创建者本身无权禁止玩家加入游戏。
4. 玩家不能取消一个正在进行的游戏。游戏一旦开始，必须结束，所以当输入`/开始游戏`的时候，请慎重。强行退出群组、结束聊天等可能引起机器人运行异常，进而影响其他玩家的游戏体验。
5. 玩家的发言应该以游戏体验为主，尽量围绕自己的词汇本身的含义进行讨论，不应该对词进行*解构*，比如不鼓励以下发言：“我的词的第一个字是左右结构，第二个字是上下结构”；同时，玩家的发言也不应该*过于*模糊，比如“一种东西”。
6. 机器人本身并不接受命令，所有的命令请发送在游戏群里。
7. 请尊重各位游戏参与者，不要随意发言、开始游戏，不要做出不友善行为。友谊第一，游戏第二。
8. 如果发现机器人出现bug，确定是机器人的问题的，请私聊管理员处理。

### 本机器人基于MIT协议完全开源，欢迎贡献代码，祝你们玩的开心。

