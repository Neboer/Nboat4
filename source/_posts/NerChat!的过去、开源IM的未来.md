---
title: NerChat!的过去、开源IM的未来
title_url: nerchat-and-the-future-of-instant-message-services
type: blog
date: 2022-10-24
updated: 2023-08-16
tags: 
- NerChat!
- 开源im
- 开源软件
- RocketChat
- Matrix
- Element
- dendrite
categories:

big_cover: 
small_cover: https://nboater.oss-cn-beijing.aliyuncs.com/Nelement.png
mark: 100
---
# NerChat!的过去、开源IM的未来
> NerChat! 最近在没有任何通知的情况下，直接更新成了一个静态部署的Element站点。这篇文章就大概讲一下，最近发生在NerChat!上的事情，以及，Neboer又捣鼓了什么。当然，Neboer也不会忘记继续嘴碎的念叨一下关于开源IM的未来的问题。

 

**2022/10/24 Happy Programmer's Day!**

NerChat!是在三年前作为Nboat1一起上线提供的一个服务而开启的，本来的目的是为了充分利用服务器的资源做一些多余的事情，但是后来随着Neboer身边的一些朋友对于开源聊天平台的热情越来越高，Neboer逐渐把NerChat!运营成了一个开放的公益平台，虽然其学习性质没有变化，不过它对Neboer的日常生活确实造成了一定的影响。

## 基于RocketChat的NerChat!

在此次更新之前，chat.neboer.site一直用RocketChat做部署。RocketChat具有很多优势，比如前后端不分离、可定制程度高、和neboer.site一样使用mongodb、部署方便、页面UI清楚美观、多端支持、生态固定、历史悠久等等。RocketChat在NerChat!上线的两年时间里一直表现优秀，让NerChat!有了近300个用户。

NerChat!也在此期间围绕RocketChat的mentor部署编写了一些脚本、做了一些网页，比如自动更新、自动安装、自动部署、自动同步下载github RocketChat客户端的最新版本、“谁是卧底”机器人等等。Neboer自己也经常在neboer.site上发文章讲述NerChat!遇到的各种问题、维护记录以及其他的内容。NerChat!已经成为了neboer.site除了部署neboer自己的博客站以外，可提供的服务之一。

从Nboat1开始编写算起，我大约为NerChat!付出了将近三年的维护时间。这三年时间里RocketChat也从最开始的2.x.x版本更新到了现在的5.x.x，但主要的功能依然没有太大的变化，不过数据库倒是升级了不少。这期间还出过各种各样的问题，RocketChat自己的bug不算少，但由于是上市公司，所以修复还是比较勤的。让我印象最深刻的bug应该是一个最近出现的、升级到5.0之后关于[语言undefined导致页面报错](https://github.com/RocketChat/Rocket.Chat/issues/26352)的，除此之外，还有一个更严重的migration的问题，不过那个问题的成因比较复杂，主要是我过分追求更新速度，直接使用Github Actions的最新的构建结果来部署服务器，结果当然遇到了一个棘手的database migration错误，这导致了我自己的数据库无法成功升级到下一版本。这个错误一直没有人修复，我一度以为NerChat!需要删库才能更新的时候，意外的发现当时的最新版RocketChat已经可以支持这个错误版本的升级了。

以后的日子里，NerChat!就一直沿用RocketChat来部署，除了在neboer.site里发布的定期维护说明，一直保持着稳定在线。

## RocketChat以及喜欢这里的人们

NerChat!的部署总体来说并没有得到非常好的宣传效果，虽然根据Google的搜索趋势来看，每天因为NerChat!而来访问neboer.site的用户并不在少数，但是NerChat!本身却并没有多少新的用户。很多已经加入了NerChat!的用户也几乎不再回来了，这可能也和客户端下载的操作比较繁琐复杂有关系，而且RocketChat的Android端在国内没有什么镜像，直接从Github上下的话几乎完全没有速度——虽然这个问题随着后来RocketChat客户端镜像站的建立而得到了改善，但是总体来说并不是很受人喜欢。倒是有不少人到群里问，如何自建RocketChat服务器，我只能说多看官方文档，因为我实在是没必要把整个文档都翻译过来，而安装RocketChat的方法又千奇百怪，正统的方法可以用Mentor来安装，但是我的方法是直接下载构建好的prebuild binaries，另外你当然也可以自己构建，或者用RocketChat官方的自动更新脚本，甚至可以直接拉取docker镜像来……

我不清楚人们到底用NerChat!聊了什么，不过我当然希望大家能用得开心。NerChat!的一个很重要的宣传功能就是打开并沿用了RocketChat的E2EE功能，用户可以在私聊或者群聊的时候打开这个功能，交换自己的E2EE公钥，来保证自己的聊天内容的完全加密。这个“完全加密”是以RSA非对称加密密钥交换的密码学为基础来保证的，它的作用是让你有足够的信心“相信”和你对话的那个人就是那个人、以及服务器没有任何的方法来获得你们聊天的明文内容。

安全、隐私、加密的聊天是一个非常方便且有趣的技术，它使得聊天的内容在互联网上完全隐藏起来。如果说TLS是给TCP传输提供了私密信息管道的话，E2EE就是互联网聊天室的“TLS”，你和另一端是TLS的两端，服务器只是充当了转发和存储密文的角色。

但是随着我们对RocketChat代码的调查和审慎的思考，我们发现它并不是开源聊天的最终解决方案。

## Matrix——拥抱开源聊天的未来

在neboer.site选择RocketChat的时候，Riot还没有改名成element，并且没有现在这么知名，Neboer对这个服务了解不够，再加上matrix服务端部署略复杂，使用和neboer.site完全不同的数据库……我最终还是选择了RocketChat。不过在2022年快结束的今天，RocketChat真的是开源聊天的好选择吗？我觉得……差了点意思。

NerChat!最主要的功能就是“安全性”，因此我的想法是建立一个“安全”的聊天平台，最起码要保证无论是客户端还是服务端，E2EE功能都要是高可用的。RocketChat的E2EE非常不稳定，经常出现一个对话里明明打开了E2EE，但是聊天就是不加密钥的情况。而且RocketChat并不是主打E2EE这种功能的，直到今天，RocketChat的E2EE还只是“实验性”(experienmental)功能。RocketChat的E2EE实现只是在原来的聊天内容中把要发出的明文要密码加密、然后base64到远端服务器而已，我并不认为这是一种非常好的实现，因为E2EE是一套复杂的系统，比如身份认证——E2EE远不只是用经过公钥交换的对称密钥来加密消息本身而已嘛。RocketChat的E2EE体验非常糟糕，以致于很多时候，追求机制保密只能选择OTR（阅后即焚）——使用临时生成的密码来交换信息，不过好在还有一个OTR——OTR提供的加密体验倒是可以的——虽然依然没有验证对方身份的功能。

因此，在前几天，经过慎重的选择之后，Neboer决定把NerChat!换成element的静态站点，同时在matrix.neboer.site上部署matrix服务端。

相比于RocketChat，Matrix是一个优秀得多的选择——Matrix是一个完全社区驱动的生态，同时有相当完美的客户端实现，前端设计又现代又精美，传统的Matrix服务端Synapse使用Python作为主要的语言，功能复杂且全面，但是比较消耗资源。经过慎重的思考和测试，Neboer还是决定使用Matrix的另一个轻量的服务端实现dendrite。美中不足的是dendrite目前只处在alpha版本中，很多功能（尤其是admin api）还没有实现，并且可能有潜在的bug。不过如聊天、加房间、用户登录注册等等基本功能已经趋于完善，为了免除日后换端的苦恼，neboer.site直接采用dendrite做服务端了。（但Neboer现在有点后悔了，不过数据库并不互通所以，无所谓了，就用dendrite吧）

使用Matrix之后，就必须抛弃RocketChat了，因为Neboer的贫穷小主机实在是没办法同时承担这两个服务同时打开的性能开销，所以把NerChat!关停后，我把它的mongodb存储内容也全清空了，当然服务器上还保留了备份，但是我觉得这个备份的意义并不大……

neboer.site的服务器的软件也在更换服务端之前顺便更新了，服务器也升级到了Ubuntu系统的最新版本。我下载了Matrix的最新服务端[dendrite](https://github.com/matrix-org/dendrite)，在本地构建了一下，然后就开始翻官方的配置文件说明，尝试配置一个自己真正的Matrix节点。很快，第一版的配置文件就已经写好了，然后直接，部署，运行！

matrix.neboer.site只是Matrix后端。如果想让人能够便利的使用，当然需要一个配套的前端。Matrix协议有相当多精美的前端实现，我在这就选择开源世界里应用最广泛的[element](https://github.com/vector-im/element-web)。这个静态的网站可以直接在Nginx上部署，甚至可以套CDN（但没有套），而且自定义程度很高（虽然现在并没有什么自定义）（草）（鸽子Neboer大家忍一下），最最最最重要的是：Matrix协议安全、element界面精美，二者的配合大有一种“郎才女貌”的意味，很好的实现了“开源端到端加密的安全聊天”这一需求。是目前最贴近Neboer理想的开源聊天软件。同时和RocketChat一样，Matrix生态也在积极开发，而且越来越成熟。

## Neboer的折腾

如果你看过Neboer以前的文章，就绝对会知道Neboer是一个什么样的人。没错——生命在于折腾！Matrix社区做不好的地方由我来替它做好，那么……

### Element Android 碎碎念

Element官方推出了一个非常好用的Android app——[Element Android](https://github.com/vector-im/element-android)。好用吗？好看！Element Android有一个最离谱的bug就是登录——element android并不像RocketChat的Android版本一样，在你刚刚下载之后就让你填写一个服务器的地址，而是会优先在**阻塞UI**的前提下与element.io通信——呃呃？！虽然有人已经在issue里指出了这个问题，但element的官方仅仅是增加了一个“如果连接失败就允许第三方登录”的选项，喂喂！完全没有诚意啊！难怪这里说element正在使matrix社区越来越中心化，感觉这个地方也是一个可以黑的地方。

那么Element做不好的地方就让Neboer替你做好好了。我直接对Element Android来了一个超级修改——然后取名Nelement（草），这个新的APP在打开的时候默认选择matrix.neboer.site做为默认的服务端，在开启后可以阻塞的和matrix.neboer.site通信（好吧，我并没有把整个逻辑都拿掉）。之所以没有对程序逻辑作出巨大修改的原因是，这个APP的构建实在是太离谱了，在国内完全无法访问Google服务，只能依靠代理来下载依赖的时候，Gradle变本加厉的下载了大量的软件包，把我的固态硬盘所剩无几的空间都吃满了不说，还消耗了大量的时间。在服务器上的构建也非常离谱，经常遇到代理断线的情况……怎么说呢，只能说懂的都懂，我就不说了哈哈哈（*留一长串笑声给大家自己体会。）

所以，最后Neboer只是简单的基于反编译的APP源代码，来做了一个字符串替换。并不是很高级的操作，而且分发这个修改之后的软件可以说[在一定程度上违反了Element Android的GNU GPL协议](https://opensource.stackexchange.com/questions/7716/am-i-allowed-to-decompile-a-gpl3-software-if-i-didnt-get-source-with-it)。所以我还在寻求更好的解决方法（Neboer菜死了呜呜呜）。

开发Nelement也消耗了我相当多的时间，我设计了大量的软件图标，甚至还模仿Element原来的UI制作了矢量图，md真的累死我了。这辈子不会碰Android软件开发了。

### Dendrite没有“新用户自动加群”的功能

是因为看中了Dendrite的性能，所以才选择的这个软件做Matrix的服务端。不过dendrite似乎并没有那么省心，缺少了许多admin api不说，还缺少了许多关键的功能，其中最让我不能忍的就是不支持auto_join_rooms配置。这个配置可以让用户在刚刚加入服务器之后就立即加入一个房间，避免了新用户面对一片空白的屏幕无从下手的尴尬。

这个功能既然没有，那么就想办法实现。我最开始打算写一个服务器的脚本来自动监控新用户注册，如果用户注册，那么立即执行admin API命令，将用户加入大群里。这个做法听起来非常了不起，但是实现起来却发现非常困难——[dendrite支持的admin API非常有限](https://matrix-org.github.io/dendrite/administration/adminapi)，在dendrite已经实现的admin_api里，并没有add_user_to_group这种功能。那怎么办？我们要换synapse了吗？

不，我们不需要！既然dendrite没有，我们就用自己的双手去给它实现一个出来！因此我fork了dendrite的主仓库，捣鼓了一个支持"auto_join_rooms"配置项的dendrite服务器出来！（golang，好欸！）并顺手开了一个[Pull Request](https://github.com/matrix-org/dendrite/pull/2823)。官方合并与否都无所谓，主要是如果能帮上有需求的用户的忙就很好了。

不得不说，golang是相当优秀的语言，dendrite用golang开发没什么问题，但是dendrite的代码组织有点奇怪。它的API是注册后统一传入底层router做功能实现的，所以在底层router里无法访问到所有的API，比如“注册用户”的流程里就完全没有“加入房间”的API可供使用，如果想用的话需要把这个API从顶层一直透传到注册用户的处理函数内部……感觉比较奇怪。这里如果可以把整个Server变成一个大的“对象”，然后把各个API作为其属性，统一在Server初始化的时候也跟着初始化，那样可能会方便许多。

总之Talk is cheap, I have no code to show.（）希望这个PR可以引起开发者的重视，把这个功能加上。我个人觉得还挺重要的。

## 开源IM的未来

Instant Message是人类永恒的追求之一。我们共同期待着有一天一个人的想法可以以最快的速度抵达另一个人的大脑，没有任何的壁垒和障碍，你可以让任何你想知道的人知道消息的内容，其他人完全无法得知你们交换了什么。通信自由的权利作为基本的人权之一，神圣而不可侵犯。我认为开源IM在这一点上做的非常好，Matrix可以取代RocketChat的位置，当之无愧的被评为Neboer心中最佳的开源软件”。（什么不是Linux吗？对不起，Linux不是软件（）？？）

开源IM的未来，去中心化必然成为主流。社区中有限的节点形成了一张大网，把所有的人囊括其中。每个人的信息都是经过严格的加密，以目前人类的科技水平完全无法破解，所以极大的保证了信息的自由与安全。同时社区共同维护的开源软件并不受到很多的约束，以软件本身的质量而不是盈利为目的脱离了资本对人的控制，是一种理想的操作方式，值得被广泛宣传。

Matrix哪里都好，就是[主站](https://app.element.io/)上不了，这也是相当ironic的地方之一。国内目前最推荐的应该是Mozilla的开源站点[chat.mozilla.org](https://chat.mozilla.org/)，这个域名和chat.neboer.site是不是有点异曲同工的意味哈哈哈哈哈哈……

## 写在后面

Neboer在本科期间就曾经以练习为目的开发了一个非常有意思的软件——NerChat!。那个时候WebSocket标准早已成熟，但缺乏一个可靠的实现即时聊天的标准和客户端。Matrix无疑拿出了开源社区的专业态度尝试解决问题，我认为这种开源模式是非常优秀的，值得被推广。虽然vector团队本身的动机有待观察，但是不得不说Element生态确实是兼具功能性与美观的好软件，是值得期待的。希望这些开源团队能继续坚持下去，为人类继续贡献真正优秀的自由软件产品。

谢谢大家。
