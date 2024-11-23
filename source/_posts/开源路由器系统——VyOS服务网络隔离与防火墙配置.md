---
title: 开源路由器系统——VyOS服务网络隔离与防火墙配置
title_url: opensource-system-vyos-network-isolation-and-firewalling
type: blog
date: 2024-10-29
updated: 2024-11-23
tags: 
  - VyOS
  - 路由器
  - netfilter
  - nftables
  - 防火墙
categories:

small_cover: https://nboater.oss-cn-beijing.aliyuncs.com/opensource-system-vyos-network-isolation-and-firewalling/nftables2.jpg
mark: 80
---

# 开源路由器系统——VyOS服务网络隔离与防火墙配置

> 软路由的高度可定制性是其核心优势。在之前工作的基础上，我们继续研究基于VyOS的网络结构和防火墙设计，将家庭网络划分为开放和隐私两部分，充分利用VyOS的灵活性，以实现在家庭内网中部署对外服务设备的同时，保障隐私内网的隔离性，确保网络安全。

我们在之前的文章中，已经重点谈论了有关VyOS的基础用法，这已经足够让VyOS来管理一个小型的家庭网络了。不过对你来说，我的朋友，这可能还远远不够。因为你可能有各种各样的网络情况，想要使用VyOS对网络进行更加精细的控制，或者想要将您的IPv4公网地址利用起来，或者想要将您的家庭内网与对外提供网络服务的内网隔离起来……别担心，我们接下来就来深入研究一下这些进阶的问题。

这篇文章主要涵盖的问题有
- 再会防火墙：IP/Bridge规则、Input/Forward Hook、转发、Prerouting/Postrouting Hook、TCP、UDP、ICMP与ICMPv6，ConnTrack等核心概念
- IPv4/v6防火墙安全性控制：允许哪些流量？
- 家庭网络区域控制：如何用防火墙隔离普通家庭网络和服务网络？
- IPv4端口转发(DNAT)、DMZ主机：将来自公网的IPv4数据包转发到不同的网络接口中。
- 一个实现了以上功能的网络实验环境的设计与搭建

本文推荐具有一定计算机网络基础的读者阅读，尤其是当您希望在家庭网络中部署对外开放的网络服务时，本文中所介绍的内容会特别有用。

## farewell，firewall.

我们需要精细的控制网络流量。因此在更深一步之前，我们不得不更深刻的认识Linux防火墙。

学习Linux防火墙，是一个漫长而艰辛的工作，涉及到多种协议和底层的知识。但切记我们认知防火墙和应用防火墙，不需要完全掌握所有的知识，所以本文提倡循序渐进学习的原则，只会给出一套基本的理论，帮助读者快速掌握netfilter的基础知识，这样大家就可以在想要自学的时候随时学习了。

VyOS的防火墙和nftables几乎没有任何区别，它们的名字、行为、配置方法和思路非常接近。实际上，你可以完全按照nftables的逻辑来理解和配置VyOS的防火墙，非常方便快捷。Netfilter为防火墙的行为绘制了一个非常详细的、已经高度简化后的示意图，之后的内容请配合防火墙的示意图理解。

![](https://nboater.oss-cn-beijing.aliyuncs.com/vyos-routing-experinment/nf-hooks.svg)

### 流量的分层

Linux的防火墙将所有操作系统处理的数据包和抽象的连接，分成了四层：
- Application层：系统中应用发送和接收的网络流量
- IP层：处理不同网桥、不同桥的网络接口间的数据流动和网络接口与应用程序间的数据流动，处理IP层报文
- Bridge层：处理网桥中的数据流动，处理以太网帧
- ARP层：处理所有的ARP数据流动，处理ARP报文

我们主要的工作都集中在IP层——防火墙的一切在这里开始。我们需要面对的重要IP层协议包括**TCP、UDP、IP、IPv6、ICMP、ICMPv6**，我们的动作有：**修改、放行、丢弃**。所谓防火墙，就是用规则匹配不同的数据包，然后再对这些数据包施以统一的动作。所以，防火墙规则可以简化成(匹配规则, 动作)的元组。

### IP层防火墙规则的Hook点与优先级

整个Linux网络栈是一个整体，我们不能随意控制其中的流量，我们只能在指定的位置添加规则。这些可以添加规则的地方被称为“Hook点”。

在IP层，我们需要重点关注的Hook点有四个：Input、Forward、Prerouting和Postrouting。

对每个Hook点，可以挂很多个(匹配规则, 动作)的规则上去，但这些规则谁先执行，谁后执行呢？这就是优先级(priorities)起作用的时候了。

每个防火墙规则，实际上都有一个优先级，当数据包抵达Hook point的时候，会按优先级从小到大的顺序执行这些规则。

关于优先级，有一些约定俗成的规定，比如SNAT默认工作在100优先级，DNAT默认工作在-100优先级等等，后面会提到。

- Prerouting：数据包刚刚抵达IP栈，此时还不知道数据包的目标接口。这是DNAT主要工作的地方，DNAT将公网收到的数据包的目标地址改为某个内网主机的内网地址，从而实现端口转发。这里也是conntrack开始追踪连接的位置。
- Input：数据包的目标是本地网络服务，比如本地连接的返回流量、公网尝试连接路由器TCP端口等。
- Forward：数据包的目标不是本地地址，需要转发到其他网络接口。比如来自公网的、目标地址是路由器的下级主机的数据包。
- Postrouting：数据包接进出站，这是SNAT主要工作的地方，SNAT的主要作用是将一个由下级主机发送的IPv4数据包的源地址改为路由器的IPv4地址，从而实现在内网到外网之间的数据包的路由。

一般情况下，除SNAT外，防火墙不需要处理出站的流量，所以我们几乎所有的时间都只在处理入站流量。

### 常用匹配规则

防火墙提供精细的流量控制，为了实现对流量的精细匹配，防火墙可以解开几乎所有常用的协议的数据包，去匹配您提供的规则。这些可以匹配的规则实在太多，因此根据循序渐进的原则，我们主要关注如下匹配规则项： **源接口、目的接口(不一定存在)、源/目标IP/IPv6地址、源/目标端口（对TCP/UDP）、协议类型、ICMP/ICMPv6的具体协议类型(如RA、echo-reply等)、ct状态** 。

大多数规则都比较直观，这个ct状态指的是ConnTrack状态：new、established、related、invalid和untracked。

| 状态        | 描述                                                         |
| ----------- | ------------------------------------------------------------ |
| new         | Netfilter 目前只在这对主机之间看到了单向数据包。至少有一个数据包是有效初始化序列的一部分，例如 TCP 连接的 SYN 数据包。 |
| established | Netfilter 已经看到有效数据包在这对主机之间双向传输。对于 TCP 连接，三次握手已成功完成。 |
| related     | 该连接是在主连接之后发起的，符合主连接的正常操作。常见例子是在 FTP 控制通道的要求下建立的 FTP 数据通道。 |
| invalid     | 分配给不遵循连接预期行为的数据包。                           |
| untracked   | 分配给已被明确排除在连接跟踪之外的数据包的虚拟状态。         |

我们没有手动修改conntrack逻辑的时候，只需要考虑new，established，related和invalid四个状态即可。默认情况下established，related都是直接放通即可，通过控制匹配conntrack new的数据包来控制是否允许外部访问，这样做的好处就是，不会彻底阻断从外向内的数据包，可以允许已经正常合法建立的连接能够正常继续通信不受默认防火墙阻断规则的干扰，但不允许新的非法连接建立。

## 防火墙要允许哪些流量？

防火墙的三大动作：修改、放行、丢弃，所有防火墙默认丢弃所有Input和Forward的流量，默认允许所有Output的流量，我们只讨论定义在Input和Forward上的放行规则。

路由器的两大接口：内网网桥（下文中的eth1），公网接口（下文中的pppoe0）。

路由器要处理的四大协议：tcp/udp、IP/IPv6、ICMP/ICMPv6

#### 常见的流量

一些常见的流量，比如DNS和DHCP，在防火墙中需要按其底层协议匹配。这些常见协议如下：

| 流量类型       | IPv4 | IPv6 | 基本匹配规则                    | conntrack状态匹配规则 |
| -------------- | ---- | ---- | ------------------------------- | --------------------- |
| SSH请求        | 是   | 是   | 目标端口是22的tcp               | new                   |
| DNS请求        | 是   | 是   | 目标端口是53的udp               | new                   |
| DHCP/BOOTP请求 | 是   |      | 源端口是68、目标端口是67的udp   | -                     |
| DHCPv6响应     |      | 是   | 源端口是547、目标端口是546的udp | -                     |
| echo PING请求  | 是   |      | 类型为echo-request的icmp        | new                   |
| echo PING6请求 |      | 是   | 类型为echo-request的icmpv6      | new                   |

尽管udp和icmp包和他们的协议可能无状态，但仍然建议使用conntrack标记这些包的状态。需要严格限制包的合法性，防止包泄露。

同时，注意到DHCP/BOOTP请求主要发生在内网主机到路由器，而DHCPv6响应主要发生在当PPPoE连接建立后，路由器作为客户端接受来自PPPoE上位服务器分配的IPv6地址和前缀（[RFC 5012](https://www.rfc-editor.org/rfc/rfc5072.html)）。这些DHCP/BOOTP、DHCPv6的源地址都是广播域，而[conntrack不会将对广播包的响应视为广播包引起连接的一部分](https://superuser.com/a/1838570/1682877)，因此这里不应该使用conntrack对数据包进行进一步限制。

此外，有关IPv6网络的邻居发现协议（ND）也需要注意。这些协议对IPv6网络的正常运行至关重要。这些就不需要conntrack，在指定的接口放通即可。

| 流量类型       | 匹配规则                          |
| -------------- | --------------------------------- |
| 路由广播（RA） | 类型为nd-router-advert的icmpv6    |
| 路由收集（RS） | 类型为nd-router-solicit的icmpv6   |
| 邻居广播（NA） | 类型为nd-neighbor-solicit的icmpv6 |
| 邻居收集（NS） | 类型为nd-neighbor-advert的icmpv6  |

如果想要让PPPoE正常工作，推荐放通Multicast Listener Discovery（MLD）数据包，这样运营商就知道路由器在监听多播地址，可以提高运营商的多播性能。

| 流量类型 | 匹配规则                           |
| -------- | ---------------------------------- |
| MLDv1    | 类型为mld-listener-report的icmpv6  |
| MLDv2    | 类型为mld2-listener-report的icmpv6 |

#### 推荐防火墙规则

根据不同协议的数据包在不同接口间的流动，可以认为路由器的防火墙可以选择仅放行如下流量：

标记为可选、推荐等的规则，建议根据实际网络情况自行选配，比如是否开启了DNS服务器，是否运行DHCP服务器等等。

1. input（目标为路由器的流量）

   | 地址类型 | 连接来源 | 连接类型                     | 规则目的                                                     | 是否必要 |
   | -------- | :------- | ---------------------------- | ------------------------------------------------------------ | -------- |
   | v4&v6    | 所有     | ct state=established/related | 允许已建立的连接通过，包括路由器向外建立连接的正常响应以及用new状态控制新连接 | 必要     |
   | v4&v6    | 内网     | DNS请求                      | 允许内网查询路由器运行的内网DNS服务器                        | 可选     |
   | v4&v6    | 内网     | SSH                          | 允许内网主机连接路由器ssh控制路由器                          | 可选     |
   | v4       | 内网     | DHCP请求                     | 允许内网请求路由器DHCP服务器                                 | 推荐     |
   | v6       | 公网     | DHCPv6响应                   | 允许公网通过DHCPv6向PPPoE分发地址与前缀                      | 必要     |
   | v4       | 内网     | PING请求                     | 允许内网主机PING路由器                                       | 可选     |
   | v6       | 内网     | PING6请求                    | 允许内网主机PING6路由器                                      | 可选     |
   | v4       | 公网     | PING请求                     | 允许公网PING路由器                                           | 可选     |
   | v6       | 公网     | PING6请求                    | 允许公网PING路由器                                           | 可选     |
   | v6       | 内网     | RS                           | 允许内网主机请求路由器广播                                   | 必要     |
   | v6       | 内网     | NS                           | 允许内网主机请求发现路由器（防止潜在的IPv6地址冲突等）       | 必要     |
   | v6       | 内网     | NA                           | 允许路由器发现内网设备                                       | 必要     |
   | v6       | 公网     | RA                           | 允许路由器通过RA获知PPPoE连接所使用的IPv6地址和前缀分配机制  | 必要     |
   | v6       | 公网     | MLDv1 MLDv2                  | 允许路由器应答MLD包，提高运营商多播性能                      | 可选     |

   注意对于dnat，由于在prerouting阶段完成的dnat修改后，目标地址改为路由器的内网地址，因此不会走input hook，会走forward。

2. forward（路由器内网向公网、公网向内网的流量）

   | 连接来源 | 连接类型                     | 规则目的                                                     | 是否必要 |
   | :------- | ---------------------------- | ------------------------------------------------------------ | -------- |
   | 所有     | ct state=established/related | 允许已建立的连接通过，包括内网向外建立连接的正常响应以及用new状态控制新连接 | 必要     |
   | 内网     | 新连接(ct state=new)         | 允许内网所有主动向外的连接，包括v4和v6                       | 必要     |
   | 公网     | IPv4 TCP/UDP新连接           | 允许来自公网的端口转发流量访问，一般用于有公网v4时的路由器级端口转发或DMZ主机 | 可选     |
   | 公网     | PING请求、PING6请求          | 允许来自公网的主机PING内网主机                               | 可选     |
   | 公网     | 普通的IPv6 TCP/UDP 新连接    | 允许来自公网的流量直接访问内网主机，通常用于允许公网访问内网IPv6服务器。 | 可选     |
   
   注意我们允许所有来自公网的IPv4 TCP/UDP新连接通过forward转发，是因为IPv4 NAT配合conntrack天然阻断了向内的访问，所以只需要配置好DNAT规则，就可以很好的控制DNAT流量，不需要在防火墙处做额外的限制。
   
   有关Forward表我们会在后面详细展开，这里先比较模糊的提一下，实际操作时用后文的方案，不建议采用这个方案。

## 区域控制：网络隔离

我们注意到，如果在内网需要开一个对公网提供服务的主机，它必须采用和普通内网设备不同的防火墙策略。也就是说，需要在内网中分成两个区域：“公开内网”和“私有内网”。“公开内网”用来对外提供服务，连一些服务器等等；而“私有内网”则主要用来连接家庭网络设备，比如手机、电脑等等日常上网的设备。这两个区域可以分属于路由器中两个不同的网桥控制，我们分配给他们不同的IPv4、IPv6网段，然后我们对两个网桥施以不同的防火墙规则——注意，两个网桥“公开”和“私有”是相对的，两个网桥的物理地位都是一样的，都属于路由器分管的一级子网。

如何划分不同的子网呢？我们还记得VyOS中有关IPv4和IPv6子网的配置方法，现在我们需要扩展到多个子网的情况：

- IPv4
  - 内网的IPv4地址首先需要给网桥分配一个网段，对这种开放网和内部网而言，两个网桥应该对应两个不同的IPv4网段。比如192.168.1.1/24和192.168.2.1/24，注意网桥的地址段本身就带有地址，也就是说这种情况下路由器会有2个不同的内网地址。
  - 内网的IPv4地址分配完全是由DHCP服务器指派的，DHCP服务器可以划分两个不同的shared-network，他们有各自的default-router和name-server。
  - 内网的SNAT规则中，增加一个rule，转发另一条网桥的流量。
- DNS
  - DNS服务器的listen-address监听两个内网网桥的地址。
- IPv6
  - 前缀委派时，需要将前缀拆成2个子网，委派到2个不同的网桥上。interface br0中有sla-id "0"，添加一个interface与sla-id的项即可。
  - 在两个接口上配置RA广播服务。
  - 这要求运营商提供小于64的前缀长度——没有短前缀的可以不用看了。

### 防火墙配置

两个网桥的防火墙配置几乎相同，与上面的配置思路基本一致，但“可选”的部分存在差异，并且两个网桥之间的流量也需要控制。

因此在上表的基础上做如下修改：

- INPUT

  | 连接来源 | 连接类型 | 规则目的                            | 是否必要 |
  | :------- | -------- | ----------------------------------- | -------- |
  | 私有内网 | SSH      | 允许内网主机连接路由器ssh控制路由器 | 可选     |

  INPUT基本保持不变，这里其实更推荐直接把SSH监听到私有内网网络接口上，就不需要这条防火墙规则了。

- FORWARD

  我们需要保证来自私有内网的流量可以直接访问公开内网，但不能反过来，所以需要写更明确的Forward规则，下表直接替换上面的Forward规则：

  | 连接来源 | 连接目标 | 连接类型                     | 规则目的                                                     | 是否必要 |
  | :------- | -------- | ---------------------------- | ------------------------------------------------------------ | -------- |
  | *        | *        | ct state=established/related | 允许已建立的连接通过，包括内网向外建立连接的正常响应以及用new状态控制新连接。 | 必要     |
  | *        | 公网     | 新连接(ct state=new)         | 允许所有主动向公网的连接，包括v4和v6                         | 必要     |
  | *        | 公开内网 | 新连接                       | 允许所有主动向公开内网的连接，包括v4和v6                     | 可选     |

这里直接允许了所有到公开内网的所有新连接，这是一种简便的写法，相当于同时放通了到公开内网的ping/ping6、TCP/UDP、IPv4/IPv6连接。和之前说的一样，到公开内网的IPv4端口转发，应该完全由DNAT模块控制，防火墙就不需要特意的去拦截什么了。实际上防火墙就相当于拦了所有到私有内网的流量，放通所有到公开内网和公网的流量而已。

### 有关内网设备的网络隔离

在现代网络中，内网的隔离需求日益增强，尤其是在保护敏感设备或防止不必要的网络访问时，合理的网络隔离策略显得尤为重要。然而，网络隔离并不仅仅是简单地阻断设备之间的通信，其实施过程会涉及复杂的协议拦截、广播控制以及潜在的功能性限制。本文将探讨网络隔离的实现方法及其问题。

#### 网络隔离，不是网络隐藏

**网络隔离** 的目标是限制内网设备之间的直接通信，确保设备访问仅限于经过明确授权的路径，从而实现更高的安全性。
 与之相对，**网络隐藏** 则是试图让设备从协议层面“不可见”。尽管隐藏手段（如阻止ARP或ND广播）可能间接实现隔离效果，但它们通常容易被破解，且对网络功能可能造成不可预期的影响。

因此，网络隔离的核心是建立明确的流量控制规则，而不是简单地通过隐藏设备来解决问题。

#### 基于网桥过滤的网络隔离方案及问题

网桥是实现内网隔离的一种常见手段，通过在网桥层面过滤流量，可以有效阻止内网设备之间的直接通信。然而，这种方案并非完美，尤其是在处理广播、协议功能和外部设备时，可能带来以下问题：

##### 1. 对ARP广播的选择性拦截 —— 阻止内网硬件地址泄露

在IPv4网络中，ARP（地址解析协议）是设备获取目标IP地址对应MAC地址的关键手段。通过选择性拦截ARP广播，可以防止内网设备知道其他设备的硬件地址，从而限制设备之间的直接通信。这样就从源头上阻止了两个网络设备互相知道对面的硬件地址，也就阻止了内网设备硬件地址发现的可能。但除了ARP外，还有很多通信会暴露设备的硬件地址，比如对DHCP/BOOTP的首包、DHCPv6首包等等，这些广播包会在网络上蔓延，需要很复杂的配置才能防止这些数据包蔓延到其他主机，而如果不拦截他们，ARP拦截所提供的安全性就毫无意义。

##### 2. 对功能性协议的拦截 —— 对网络正常功能的影响

除了DHCP/BOOTP和DHCPv6外，许多现代网络功能依赖于设备间的广播或多播协议（如mDNS、NetBIOS、LLMNR等）进行服务发现和通信协调。拦截这些协议的流量，阻止设备通过广播或多播获取其他设备的信息。不过这样打印机、文件共享服务可能无法被发现，很多程序所依赖的发现服务则无法实现。

##### 3. 对IPv6 ND的拦截 —— 潜在的IPv6地址冲突

在IPv6网络中，邻居发现协议（ND）类似于IPv4的ARP，用于设备之间的地址解析和邻居关系维护。如果拦截ND请求或应答，可能会影响IPv6网络的正常功能，设备可能因为无法正确解析邻居信息而发生IPv6地址冲突。

##### 4. 路由器无法控制的外部网桥

如果网络中存在路由器无法控制的外部网桥（例如连接内网的交换机、工作在交换机模式的无线路由器等等），这些设备可能直接转发流量，绕过路由器的防火墙规则。即使路由器已经配置了严格的隔离规则，外部网桥上的设备仍可能直接通信，攻击者可能利用外部网桥绕过网络隔离措施。

##### 5. VLAN隔离

VLAN是最彻底的隔离，这种隔离方法有以上所有方法的全部问题。需要更加专业和复杂的配置，VyOS可能无法满足这样的需求，并且这已经远远超出本文的探讨范围，因此不在这里过多讲述了。

总之，我认为除非是对安全性有极高的要求，否则不要轻易使用内网隔离，而且不是所有的网络都可以进行内网隔离，比如不使用路由器网桥的桥接设备之间互相通信，路由器就鞭长莫及了，使用的时候安全性需要考虑多方因素，不能一概而论，深入的探讨已经远远超出本文研究的范围，因此不做讨论。网络隔离不仅仅是简单的设备间阻断，而是涉及复杂的流量管理和协议分析。只有通过全面的规划和细致的配置，才能在提高安全性的同时维持网络的正常运行。

## DNAT与DMZ主机配置

前面一直在说端口转发和DNAT的事，我们正式的看看，在VyOS中，如何正确配置IPv4-IPv4的DNAT实现IPv4端口转发。这个内容仅限高级用户，因为它的前提是你的路由器可以分配到一个真正的公网IPv4地址——而这在中国大陆是相当奢侈的事情。

```apache
 destination {
     rule 100 {
         description "Regular destination NAT from external"
         destination {
             port 3389
         }
         inbound-interface pppoe0
         protocol tcp
         translation {
             address 192.0.2.40
         }
     }
 }
```

整个VyOS的NAT配置分为两个部分：“匹配”和“动作”，整个配置除了translation之外，几乎全都是用来匹配流量的，这个配置方法和SNAT是完全一致的。translation中记录了需要如何修改这个连接，一般情况下我们只需要将匹配的连接的目标地址修改成我们希望接收这个连接的主机的地址即可——如果主机的网络地址是DHCP分配的，这需要配合DHCP中的static-mapping功能，将指定主机的内网地址固定住。具体的配置方法请参考上篇文章中的“IPv4 端口转发”那个部分的内容。

如果想要在这里配置一个DMZ主机，你需要在这里把 destination 块给取消，就可以匹配所有的入栈包。

## VyOS的防火墙规则配置方法

那么接下来我们需要把我们的配置写成VyOS的配置文件。我们如何实现这一点？我们需要了解VyOS的防火墙配置块——一个非常具有VyOS特点的、nftables的兼容层规则。

### 防火墙规则块

首先，防火墙规则是防火墙的基本组成部分，所有的生效规则都位于 firewall->ipvx->chain->hooktype 下。在我们的配置中 chain 总共有 forward 和 input 两种， hooktype 里只需要用到 filter 。在这里面可以定义一系列的规则，首先需要定义一个 default-action，然后在下面写 rule xx 添加规则块。

```apache
firewall {
    ipv4 {
        input {
            filter {
                default-action "drop"
                rule 60 {
                    action "accept"
                    description "allow private LAN ssh"
                    destination {
                        port "ssh"
                    }
                    inbound-interface {
                        name "br0"
                    }
                    protocol "tcp"
                    state "new"
                }
            }
        }
    }
}
```

这个规则块的配置方法和nat的配置方法大同小异（或者不如说VyOS的这些部分都是nftables的转译层，并无大差别），整个配置中只有 actions 表示具体的动作，其余各块都表示匹配规则。这些匹配规则必须同时满足，才能判定一个包使用此规则。rule后面的数字是这个规则的优先级，优先级描述了这个包将在多早进行匹配。VyOS的优先级是其原创的概念，大体上可以理解成同表下最终转译成nftables的每行的先后顺序。优先级的行为和nftables中的顺序一概念是一致的。

- **优先级较小的规则会首先被匹配**，即优先级数字越小的规则会优先被处理。
- **规则的优先级越小，意味着它会越早被执行**，因此优先级小的规则通常用来处理常见或高优先级的流量。
- **如果流量匹配了一个规则**（无论是允许还是拒绝），则后续的规则将不会被检查，这就是为什么要确保规则按优先级合理排序。

这个规则就是一条nftables规则被拉长之后的结果。这句话写成等效的nftables规则大概是

```apache
table inet filter {
    chain input {
        type filter hook input priority 0; policy drop;
        
        tcp dport ssh iif "br0" ct state new accept
    }
}
```

整个规则想要表达的意思就是，允许从 br0 接口进入的 SSH 流量。一句话写完的事，但是要在VyOS里写11行。不过VyOS的配置要遵守规则，提供更好的代码提示和合理性校验的方法，也算是规范化解决问题的一种实践吧。

### 防火墙组

对于需要在配置文件中反复使用的一些网络接口的集合，或者网络地址段、端口端，最好的方法就是用组来将他们标记成一个整体，简化以后的配置。VyOS中的防火墙组使用firewall-group配置，其中有address-group/interface-group等组的定义，可以配置的项参考[这篇文档](https://docs.vyos.io/en/latest/configuration/firewall/groups.html)。

无论是 nat 还是 firewall 模块都可以直接使用防火墙组——没错，防火墙组只是一个称呼，只要用到nftables配置的地方就都可以使用这种防火墙组，比如nat模块。

具体使用的时候，需要首先在firewall中定义group：

```apache
firewall{
    group {
        address-group ALL-V4-SUBNET-ADDRS {
            address "192.168.1.100-192.168.1.254"
            address "192.168.2.100-192.168.2.254"
        }
        interface-group LANINFS {
            interface "br0"
            interface "br1"
        }
    }
}
```

使用上面定义好的group的方法：

```apache
firewall {
    ipv4 {
        input {
            filter {
                rule 30 {
                    action "accept"
                    description "allow DNS"
                    destination {
                        port "domain"
                    }
                    inbound-interface {
                        group "LANINFS"
                    }
                    protocol "tcp_udp"
                    state "new"
                }
            }
        }
    }
}
```

这是一个DNS服务器的配置，这个配置允许内网所有网络设备访问位于路由器的DNS解析服务器。因为内网所有服务器都需要向路由器来查询DNS地址，所以路由器需要同时接受来自两个内网网桥（公开内网、私有内网）的查询请求，这两个内网网桥也会经常作为源接口或者目标接口出现在防火墙配置中，所以把他们组合起来并在后面的配置中像这样使用。

这个配置中，inbound-interface 不再是一个name，而是一个group，所有的这种定义好的group在配置文件中使用的时候，这个配置必须明确支持传入一个group类型的对象，之后才能在group中提供对你已经定义好的组名的补全。

## VyOS 防火墙组网实验

所以，从以上理论出发，我们在完全虚拟的环境中进行了一次真正的使用VyOS进行组网的组网实验。实验中，我们完全模拟了公网环境（主机）、云服务商（PPPoE上位机）、家庭光猫（桥接，这里忽略）-路由器（主要配置对象）、内网主机四类需要关心的主机，通过VirtManager搭建了一个由虚拟网桥连接的完整的小型网络，模拟了上位机建立PPPoE连接分配ipv4地址、ipv6地址和ipv6前缀给路由器，同时控制路由器分配内网ipv4地址和公网ipv6前缀给两个网桥，两网桥分别将地址对应公开内网和私有内网，最终通过一系列虚拟机来完整的模拟家庭网络整个网络地址分配的全流程。同时我们在路由器上配置防火墙规则，探索路由器防火墙规则的一般配置。

### 基本网络结构

我们的整个网络环境的基本设计结构如下：

![](https://nboater.oss-cn-beijing.aliyuncs.com/vyos-routing-experinment/vyos_routing_experinment.svg)

图中，主机和两个主要的虚拟机被虚线圈了出来，而两个archlinux主机作为两个下位机，用实线表示。整个系统大概的结构为 公网host-公网网桥vmbr0-上位网关gateway-小区网桥vmbr1-路由器router-内网网桥vmbr2/3/4-内网设备archlinux 。

图中还标名了每个网络接口的物理地址和IP地址和IPv6地址。可以看到我们将网络主要分为了如下几个部分：

IPv4

| 网络类型          | 地址段         |
| ----------------- | -------------- |
| 公网              | 100.100.0.0/16 |
| 公网主机网段      | 100.100.1.0/24 |
| 公网PPPoE分配网段 | 100.100.2.0/24 |
| 内网              | 192.168.0.0/16 |
| 内网公开网段      | 192.168.2.0/24 |
| 内网私有网段      | 192.168.1.0/24 |

IPv6

| 网络类型                                                     | 所在IPv6地址段 | 可能所在的IPv6地址段 | 实际可能IPv6地址段         |
| ------------------------------------------------------------ | -------------- | -------------------- | -------------------------- |
| 所有公网网段                                                 | 3fff::/29      |                      |                            |
| 公网主机                                                     | 3fff:1::/112   |                      |                            |
| PPPoE服务器                                                  | 3fff:2::1/128  |                      |                            |
| PPPoE可以分配的所有IPv6-IANA所在的地址池                     | 3fff:3::/48    |                      |                            |
| PPPoE可以分配的所有IPv6-PD所在的前缀池                       | 3fff:4:/32     |                      |                            |
| 路由器PPPoE网络接口的IANA地址（例）                          | 3fff:3:0::/48  |                      | 3fff:3:0\:a::/64           |
| 路由器PPPoE网络接口获得的总共可分配的前缀（例）              | 3fff:4:/32     |                      | 3fff:4:/60                 |
| 路由器在PPPoE获得的总共可分配的前缀（例）中委派给私有内网br0的IPv6前缀（例） | 3fff:4:/32     | 3fff:4:/60           | 3fff:4:0:1::/64            |
| 路由器在PPPoE获得的总共可分配的前缀（例）中委派给公开内网br1的IPv6前缀（例） | 3fff:4:/32     | 3fff:4:/60           | 3fff:4:0:0::/64            |
| 公开内网中某个主机的地址                                     | 3fff:4:/32     | 3fff:4:0:0::/64      | 3fff:4:0:0​\:a\:b\:c\:d/128 |
| 私有内网中某个主机的地址                                     | 3fff:4:/32     | 3fff:4:0:1::/64      | 3fff:4:0:1\:a\:b\:c\:d/128 |

主机连接到整个虚拟网络的方法有两个网桥，一个是vmbr0，一个是vmbr4，这两个网桥在主机中的名字分别为virbr1和virbr5。其中vmbr0主要的作用是将主机连接到整个网络中的公网部分，这样就可以实现用主机来做公网机器测试虚拟机的状态；gateway的主要功能是开PPPoE服务器，为路由器提供PPPoE连接，给它提供IPv4地址。它的PPPoE服务器还集成DHCPv6，为路由器提供IPv6前缀和地址，同时Gateway还承担将来自host的数据包转发到内网的功能。

Gateway通过vmbr1接口连接到路由器，这个vmbr1就相当于路由器的WAN口，这里省略了一个光猫，默认光猫是桥接模式的——WAN口需要路由器自己拨号。vmbr1直接接进路由器中，路由器使用PPPoE和服务器建立PPPoE连接，路由器里面有两个网桥，br0和br1，分别对应私有内网网桥和公开内网网桥，这两个网桥最终各自连接到一台内网的archlinux主机中。ArchLinux主机使用systemd-networkd网络管理器，网络管理器会自动分配内网主机的IPv4和IPv6地址。

主机中有一个vmbr4连接到router的私有内网网桥，只分配IPv4地址。这个网络接口是为了给主机方便的——可以通过这个接口直接用ssh登录router，毕竟router只允许来自内网的连接，主机通过访问router的公网地址是无法连接到router的。

### Host的网络配置

可以看到，host的vmbr0与Gateway中的eth0是同一个接口，但二者的IP地址在内网不同，这是因为vmbr0与eth0的作用不一样。vmbr0的作用是作为主机的路由器，将主机的流量导向整个网络系统；而Gateway中的eth0是作为整个网络系统的在Gateway中到主机的出口，需要保证自己的地址段不要和PPPoE冲突，因此需要限制一下其地址段。然而实际上，主机向内网设备的访问必须由gateway转发才能实现，因此主机必须将gateway设置成在100.100.0.0/16网段上的网关，这也是为什么运营商上位机要被称为Gateway的主要原因。

如果想让主机中所有100.100.0.0的流量经过Gateway发送，并且给vmbr0分配IPv4和IPv6地址，需要进行如下设置：

```bash
sudo sysctl -w net.ipv6.conf.virbr1.disable_ipv6=0
sudo ip addr add 100.100.1.10/24 dev virbr1
sudo ip -6 addr add 3fff:1::10/112 dev virbr1
sudo ip route add 100.100.0.0/16 via 100.100.1.1
sudo ip -6 route add 3fff::/16 via 3fff:1::1
```

首先，允许virbr1获得IPv6地址，然后将IPv4和IPv6地址手动添加进这个网桥中。之后，再使用ip命令，设置IPv4和IPv6的默认路由。设置默认路由的理由在上文中已经说过了，由于我们的实验是在虚拟环境中进行的，而主机需要正常上网，因此我们需要一个由主机到虚拟环境的入口，而这个入口就是vmbr0。

Host还有一个vmbr4的网络接口连进路由器的私有内网，这个接口会在私有内网一章描述。

### Gateway的配置

Gateway没有什么好说的，就是定义了两个网络接口，一个是主机到Gateway的运营商网络接口，还有一个是Gateway到路由器的小区网络接口。Gateway中主要是开了一个PPPoE服务器，定义了要分配的IPv4地址段和IPv6地址段和前缀段。

```apache
interfaces {
    ethernet eth0 {
        address "3fff:1::1/112"
        address "100.100.1.1/24"
        hw-id "52:54:00:87:dc:54"
    }
    ethernet eth2 {
        hw-id "52:54:00:59:4b:f5"
    }
    loopback lo {
    }
}
service {
    pppoe-server {
        authentication {
            local-users {
                username test {
                    password "test"
                }
            }
            mode "local"
        }
        client-ip-pool v4p1 {
            range "100.100.2.100-100.100.2.254"
        }
        client-ipv6-pool v6p1 {
            delegate 3fff:4::/48 {
                delegation-prefix "60"
            }
            prefix 3fff:3::/48 {
            }
        }
        default-ipv6-pool "v6p1"
        default-pool "v4p1"
        gateway-address "100.100.2.1"
        interface eth2 {
        }
        name-server "100.100.1.1"
        name-server "3fff:1::2"
        ppp-options {
            ipv6 "prefer"
        }
    }
}
```

这是简化版的部分配置，完整的配置在文章结尾可以下载到。可以看到这里主要给eth0分配了IP地址，eth2不需要IP地址，因为eth2主要是用来做PPPoE通信的借口，只需要在里面传输PPP协议帧就可以了，而这个协议是二层的，不需要IP地址。

PPPoE服务器部分，创建一个test用户，密码也是test，然后定义IPv4的地址池，定义IPv6-IANA地址池和IPv6-PD地址池。其中IANA地址池定义在prefix中，而IPv6-PD地址池定义在delegate中，delegation-prefix定义了每段IPv6-PD前缀的长度是60位——也就是说，每个PD可以分出2^(64-60)=16个60位长的IPv6前缀。

注意根据[文档中对PPPoE服务器的描述](https://docs.vyos.io/en/latest/configuration/service/pppoe-server.html)，如果Gateway的PPPoE服务器配置了IPv6地址池并支持PD的分配，那么需要设置ppp-options来推荐客户端获取IPv6地址和前缀。

### 路由器配置（无防火墙）

路由器的配置比较麻烦，我们拆成两部分。我们首先介绍这个熟悉的、无防火墙的部分。和上篇文章中的路由器并没有任何区别，建议参考上文来理解，这里只是多了一个内网网桥。

首先br0是私有内网的网桥，所有连接到br0的设备都是私有设备，你可以将br0桥出一个无线路由器，用来做家里日常的无线网络使用。这里私有内网连接到两个网络接口上，其中一个通过eth1-vmbr2连接到archlinux private上，这是一台模拟内网的主机。其中还有一个通过eth0-vmbr4-virbr5连接到主机的接口，这个接口是用来让主机ssh连接路由器的，因此不需要v6，也不需要DHCP。

br1是公开网桥，eth2连接到br1上，br1-eth2-vmbr3最终连接到archlinux public主机，这是一个模拟需要暴露在公网环境中的主机。从外向这台主机的所有流量都会被路由器送达。

pppoe0还是那个pppoe0，不同的是这次将两个不同sla-id的IPv6前缀分配给了两个网桥，从而实现了两个网桥地址段级的隔离。eth3是WAN口，所以做PPPoE的source-device。

在SNAT的配置中，我们引用了ALL-V4-SUBNET-ADDRS来表示所有IPv4子网地址，这包括公开内网和私有内网两个网段里所有的地址，这些地址访问外网都需要NAT对吧！所以一起配置比较方便，好写好看。

pubnat1和prinat1对应两个DHCP地址分配的地址池。两个地址池从前缀上就是互相隔离的，确保不会互相影响，同时也便于控制和标记数据包的流动。

router-advert对两个网桥都要做，毕竟无论公开内网网桥还是私有内网网桥里的主机都需要通过SLAAC来获取IPv6地址。

DNS就是正常使用pppoe0分配的结果，监听在所有网络接口上，实际依赖防火墙做连接控制。

ssh需要监听在所有地址上，这个后面会用防火墙来限制，ssh就直接监听就可以了。

```apache
interfaces {
    bridge br0 {
        address "192.168.1.1/24"
        member {
            interface eth0 {
            }
            interface eth1 {
            }
        }
    }
    bridge br1 {
        address "192.168.2.1/24"
        member {
            interface eth2 {
            }
        }
    }
    ethernet eth0 {
        hw-id "52:54:00:ee:63:82"
    }
    ethernet eth1 {
        hw-id "52:54:00:d8:75:19"
    }
    ethernet eth2 {
        hw-id "52:54:00:6f:76:09"
    }
    ethernet eth3 {
        hw-id "52:54:00:2b:e8:f9"
    }
    loopback lo {
    }
    pppoe pppoe0 {
        authentication {
            password "test"
            username "test"
        }
        dhcpv6-options {
            pd 0 {
                interface br0 {
                    sla-id "1"
                }
                interface br1 {
                    sla-id "0"
                }
                length "60"
            }
        }
        ipv6 {
            address {
                autoconf
            }
        }
        service-name "LOCAL"
        source-interface "eth3"
    }
}
nat {
    source {
        rule 20 {
            outbound-interface {
                name "pppoe0"
            }
            source {
                group {
                    address-group "ALL-V4-SUBNET-ADDRS"
                }
            }
            translation {
                address "masquerade"
            }
        }
    }
}
service {
    dhcp-server {
        shared-network-name pubnat1 {
            subnet 192.168.2.0/24 {
                default-router "192.168.2.1"
                range 0 {
                    start "192.168.2.100"
                    stop "192.168.2.254"
                }
            }
        }
        shared-network-name prinat1 {
            subnet 192.168.1.0/24 {
                default-router "192.168.1.1"
                range 0 {
                    start "192.168.1.100"
                    stop "192.168.1.254"
                }
            }
        }
    }
    dns {
        forwarding {
            allow-from 0.0.0.0/0
            allow-from ::/0
            dhcp pppoe0
            listen-address 0.0.0.0
            listen-address ::1
        }
    }
    router-advert {
        interface br0 {
            prefix ::/64 {
            }
        }
        interface br1 {
            prefix ::/64 {
            }
        }
    }
}
```

仅此而已，路由器的配置并不复杂。不过接下来才是我们的重点——防火墙配置。

### 路由器防火墙配置

路由器防火墙中首先定义防火墙组，这里定义了一个地址组一个接口组，地址组包括了所有的内网地址，接口组包括了所有的内网接口，包括私有内网和公开内网两个内网地址段。

接下来的防火墙分为IPv4和IPv6两个配置块，两块配置大体相同，主要就是实现了上面说的那些规则，没有特别的。注意VyOS中，虽然每块中只有 action 是动作，剩下的所有匹配都是需要同时满足的条件，但是state这个变量可以多次定义来表达“或”的条件，而不是同时满足的意思。

实际配置的时候请根据自己网络情况，替换配置文件中的相应网络设备的名字。

还有就是类似` destination { port "domain" } ` 这种写法，是一种nftables支持的端口名字规则，可以用端口的具体名字来代替端口，这个domain和53的效果是一样的。这种端口和名字对应的列表可以查看IANA提供的[service-names-port-numbers对照表](https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xml)，最左一行Service Name就是可以用来区分不同服务所用端口的名字。

这个规则有优化的空间，可以通过类似jump的机制把规则分成不同的区间，这样可以不用IPv4和IPv6分开各写一遍，看起来更加简洁。

```apache
firewall {
    group {
        address-group ALL-V4-SUBNET-ADDRS {
            address "192.168.1.100-192.168.1.254"
            address "192.168.2.100-192.168.2.254"
        }
        interface-group LANINFS {
            interface "br0"
            interface "br1"
        }
    }
    ipv4 {
        forward {
            filter {
                default-action "drop"
                rule 10 {
                    action "accept"
                    state "established"
                    state "related"
                }
                rule 20 {
                    action "accept"
                    outbound-interface {
                        name "pppoe0"
                    }
                    state "new"
                }
                rule 30 {
                    action "accept"
                    outbound-interface {
                        name "br1"
                    }
                    state "new"
                }
            }
        }
        input {
            filter {
                default-action "drop"
                rule 10 {
                    action "accept"
                    state "established"
                }
                rule 20 {
                    action "accept"
                    state "related"
                }
                rule 30 {
                    action "accept"
                    description "allow DNS"
                    destination {
                        port "domain"
                    }
                    inbound-interface {
                        group "LANINFS"
                    }
                    protocol "tcp_udp"
                    state "new"
                }
                rule 41 {
                    action "accept"
                    description "allow dhcp client communications"
                    destination {
                        port "bootps"
                    }
                    inbound-interface {
                        group "LANINFS"
                    }
                    protocol "udp"
                }
                rule 50 {
                    action "accept"
                    description "allow lan ping"
                    icmp {
                        type-name "echo-request"
                    }
                    inbound-interface {
                        group "LANINFS"
                    }
                    protocol "icmp"
                    state "new"
                }
                rule 60 {
                    action "accept"
                    description "allow private LAN ssh"
                    destination {
                        port "ssh"
                    }
                    inbound-interface {
                        name "br0"
                    }
                    protocol "tcp"
                    state "new"
                }
            }
        }
    }
    ipv6 {
        forward {
            filter {
                default-action "drop"
                rule 10 {
                    action "accept"
                    state "established"
                    state "related"
                }
                rule 20 {
                    action "accept"
                    outbound-interface {
                        name "pppoe0"
                    }
                    state "new"
                }
                rule 30 {
                    action "accept"
                    outbound-interface {
                        name "br1"
                    }
                    state "new"
                }
            }
        }
        input {
            filter {
                default-action "drop"
                rule 10 {
                    action "accept"
                    state "established"
                }
                rule 20 {
                    action "accept"
                    state "related"
                }
                rule 30 {
                    action "accept"
                    description "allow DNS"
                    destination {
                        port "domain"
                    }
                    inbound-interface {
                        group "LANINFS"
                    }
                    protocol "tcp_udp"
                    state "new"
                }
                rule 50 {
                    action "accept"
                    description "allow lan ping6"
                    icmpv6 {
                        type-name "echo-request"
                    }
                    inbound-interface {
                        group "LANINFS"
                    }
                    protocol "icmpv6"
                    state "new"
                }
                rule 60 {
                    action "accept"
                    description "allow private LAN ssh6"
                    destination {
                        port "ssh"
                    }
                    inbound-interface {
                        name "br0"
                    }
                    protocol "tcp"
                    state "new"
                }
                rule 70 {
                    action "accept"
                    description "allow ndp"
                    icmpv6 {
                        type-name "nd-router-solicit"
                    }
                    inbound-interface {
                        group "LANINFS"
                    }
                    protocol "icmpv6"
                }
                rule 71 {
                    action "accept"
                    icmpv6 {
                        type-name "nd-router-advert"
                    }
                    inbound-interface {
                        group "LANINFS"
                    }
                    protocol "icmpv6"
                }
                rule 72 {
                    action "accept"
                    icmpv6 {
                        type-name "nd-neighbor-solicit"
                    }
                    inbound-interface {
                        group "LANINFS"
                    }
                    protocol "icmpv6"
                }
                rule 73 {
                    action "accept"
                    icmpv6 {
                        type-name "nd-neighbor-advert"
                    }
                    inbound-interface {
                        group "LANINFS"
                    }
                    protocol "icmpv6"
                }
                rule 80 {
                    action "accept"
                    description "allow ra from PPPoE interface"
                    icmpv6 {
                        type-name "nd-router-advert"
                    }
                    inbound-interface {
                        name "pppoe0"
                    }
                    protocol "icmpv6"
                }
                rule 81 {
                    action "accept"
                    icmpv6 {
                        type-name "mld-listener-report"
                    }
                    inbound-interface {
                        name "pppoe0"
                    }
                    protocol "icmpv6"
                }
                rule 82 {
                    action "accept"
                    icmpv6 {
                        type-name "mld2-listener-report"
                    }
                    inbound-interface {
                        name "pppoe0"
                    }
                }
                rule 90 {
                    action "accept"
                    destination {
                        port "dhcpv6-client"
                    }
                    inbound-interface {
                        name "pppoe0"
                    }
                    protocol "udp"
                }
            }
        }
    }
}
```

#### IPv4 `input` 防火墙规则表

| 防火墙规则ID | 连接来源           | 连接或协议类型      | 连接的目标端口 | 匹配 ct 状态 | 备注                        |
| ------------ | ------------------ | ------------------- | -------------- | ------------ | --------------------------- |
| 10           | *                  | *                   | *              | established  | 允许已建立的连接            |
| 20           | *                  | *                   | *              | related      | 允许与已建立连接相关的流量  |
| 30           | LANINFS (br0, br1) | tcp/udp             | domain         | new          | 允许内网设备访问DNS服务     |
| 41           | LANINFS (br0, br1) | udp                 | bootps         | *            | 允许内网设备使用DHCP服务    |
| 50           | LANINFS (br0, br1) | icmp (echo-request) | *              | new          | 允许内网设备ping            |
| 60           | br0                | tcp                 | ssh            | new          | 允许私有内网设备通过SSH访问 |

#### IPv4 `forward` 防火墙规则表

| 防火墙规则ID | 连接来源 | 连接目标 | 连接或协议类型 | 匹配 ct 状态         | 备注                       |
| ------------ | -------- | -------- | -------------- | -------------------- | -------------------------- |
| 10           | *        | *        | *              | established, related | 允许已建立或相关的连接流量 |
| 20           | *        | pppoe0   | *              | new                  | 允许新建流量通过广域网接口 |
| 30           | *        | br1      | *              | new                  | 允许新建流量访问公开内网   |

#### IPv6 `input` 防火墙规则表

| 防火墙规则ID | 连接来源           | 连接或协议类型                | 连接的目标端口 | 匹配 ct 状态 | 备注                        |
| ------------ | ------------------ | ----------------------------- | -------------- | ------------ | --------------------------- |
| 10           | *                  | *                             | *              | established  | 允许已建立的连接            |
| 20           | *                  | *                             | *              | related      | 允许与已建立连接相关的流量  |
| 30           | LANINFS (br0, br1) | tcp/udp                       | domain         | new          | 允许内网设备访问DNS服务     |
| 50           | LANINFS (br0, br1) | icmpv6 (echo-request)         | *              | new          | 允许内网设备ping6           |
| 60           | br0                | tcp                           | ssh            | new          | 允许私有内网设备通过SSH访问 |
| 70           | LANINFS (br0, br1) | icmpv6 (nd-router-solicit)    | *              | *            | 允许IPv6路由请求包          |
| 71           | LANINFS (br0, br1) | icmpv6 (nd-router-advert)     | *              | *            | 允许IPv6路由通告包          |
| 72           | LANINFS (br0, br1) | icmpv6 (nd-neighbor-solicit)  | *              | *            | 允许IPv6邻居请求包          |
| 73           | LANINFS (br0, br1) | icmpv6 (nd-neighbor-advert)   | *              | *            | 允许IPv6邻居通告包          |
| 80           | pppoe0             | icmpv6 (nd-router-advert)     | *              | *            | 允许广域网接口路由通告      |
| 81           | pppoe0             | icmpv6 (mld-listener-report)  | *              | *            | 允许MLD监听报告消息         |
| 82           | pppoe0             | icmpv6 (mld2-listener-report) | *              | *            | 允许MLDv2监听报告消息       |
| 90           | pppoe0             | udp                           | dhcpv6-client  | *            | 允许IPv6的DHCP客户端通信    |

#### IPv6 `forward` 防火墙规则表

| 防火墙规则ID | 连接来源 | 连接目标 | 连接或协议类型 | 匹配 ct 状态         | 备注                       |
| ------------ | -------- | -------- | -------------- | -------------------- | -------------------------- |
| 10           | *        | *        | *              | established, related | 允许已建立或相关的连接流量 |
| 20           | *        | pppoe0   | *              | new                  | 允许新建流量通过广域网接口 |
| 30           | *        | br1      | *              | new                  | 允许新建流量访问公开内网   |

可以看到，防火墙配置上还是比较直觉的。VyOS把nftables的功能拆开了，其中复杂SNAT/DNAT的部分拆分到了单独的NAT模块中，而且VyOS默认开启防火墙计数，可以方便的统计防火墙规则拦截了多少数据包。具体的查看方法是在非configure模式下执行`show firewall`，就可以看到防火墙规则和对应拦截的包的数量的信息。

### 实验结论

<img src="https://nboater.oss-cn-beijing.aliyuncs.com/vyos-routing-experinment/vyos_experinment_result_evaluation.svg" style="zoom:50%;" />

上图是整个实验的最终结论。其中绿色的部分代表可以联通，红色的部分代表不能联通。我们可以看出，主机向公开内网的请求是可以访问的，但不能访问私有内网；主机不能访问路由器，但路由器可以访问主机，私有内网可以访问公开内网，但公开内网访问不到私有内网。所有的内网都可以正常上网，通过路由器访问互联网。

实际我们两个内网主机获得的网络地址如下：

1. archlinux private

   ```
   1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
       link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
       inet 127.0.0.1/8 scope host lo
          valid_lft forever preferred_lft forever
       inet6 ::1/128 scope host noprefixroute 
          valid_lft forever preferred_lft forever
   2: enp1s0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
       link/ether 52:54:00:aa:85:16 brd ff:ff:ff:ff:ff:ff
       inet 192.168.1.100/24 metric 100 brd 192.168.1.255 scope global dynamic enp1s0
          valid_lft 86170sec preferred_lft 86170sec
       inet6 3fff:4:0:1:5054:ff:feaa:8516/64 scope global dynamic mngtmpaddr noprefixroute 
          valid_lft 2591773sec preferred_lft 14173sec
       inet6 fe80::5054:ff:feaa:8516/64 scope link proto kernel_ll 
          valid_lft forever preferred_lft forever
   ```

2. archlinux public

   ```
   1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
       link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
       inet 127.0.0.1/8 scope host lo
          valid_lft forever preferred_lft forever
       inet6 ::1/128 scope host noprefixroute 
          valid_lft forever preferred_lft forever
   2: enp1s0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
       link/ether 52:54:00:44:21:cf brd ff:ff:ff:ff:ff:ff
       inet 192.168.2.100/24 metric 100 brd 192.168.2.255 scope global dynamic enp1s0
          valid_lft 85982sec preferred_lft 85982sec
       inet6 3fff:4::5054:ff:fe44:21cf/64 scope global dynamic mngtmpaddr noprefixroute 
          valid_lft 2591928sec preferred_lft 14328sec
       inet6 fe80::5054:ff:fe44:21cf/64 scope link proto kernel_ll 
          valid_lft forever preferred_lft forever
   ```

网络稳定工作，经过测试功能正常，可以在保证私有内网设备安全的同时，在公开内网设备上提供网络服务。

本实验中公开的全部资料可以访问，各位可以访问 https://github.com/Neboer/VyOSRoutingExperinment 查看本实验相关的材料。

## VyOS运维最佳实践

VyOS是支持终端shell的，可以直接 `virsh console VyOSRouter` 连接到主机上进行配置，不需要网络ssh，但这种连接方法也存在一些问题，VyOS的控制台终端和xterm-256color不兼容，尤其是换行等在终端中无法正常显示，一般不建议用这种控制台来操作VyOS，建议还是尽量要ssh操作，VyOS对ssh的兼容性是很好的，不过ssh必须要在有网络访问的情况下操作，如果万一操作不当可能会导致丢失VyOS的连接。

那我们怎么防止配置改错而造成无法连接服务器的情况呢？VyOS提供了一个[commit-confirm的机制](https://docs.vyos.io/en/stable/cli.html#cfgcmd-commit-confirm-minutes)。在configure模式中，输入`commit-confirm`，它会提示你在若干分钟之后重启，在此期间需要你输入confirm（保持在configure模式）来完成对配置的确认（我还活着！），如果到时间没有收到你的confirm，路由器会自动重启并恢复到commit-confirm之前的状态，也不需要担心未保存的配置会丢失。所以，为了自己设备的安全，在远程维护的时候一定要记得用commit-confirm来代替简单的commit呀！

根据VyOS关于[用户管理的文档](https://docs.vyos.io/en/equuleus/configuration/system/login.html#key-based-authentication)，想要使用ssh登录VyOS，可以采用下面的方法：

```apache
system {
    service {
        ssh {
            disable-host-validation
            listen-address "::"
            listen-address "0.0.0.0"
        }
    }
    login {
        user vyos {
            authentication {
                encrypted-password "$6$rounds=656000$some_password/"
                plaintext-password ""
                public-keys neboer-vyos {
                    key "neboer_ed25519_ssh_public_key"
                    type "ssh-ed25519"
                }
            }
        }
    }
}
```

ssh的配置 [disable-host-validation](https://docs.vyos.io/en/stable/configuration/service/ssh.html#cfgcmd-set-service-ssh-disable-host-validation) 可以加快ssh的连接速度，因为我们只允许内网设备连接，确保来源安全，所以大可以将host-validation关掉。可以选择性的给用户添加公钥，公钥的值就是ed25519公钥的二进制部分转成ASCII。比如如果你的ed25519公钥是`ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICLhAOgh5+44Os4k6lyVOd60FHYpwSFKQ/dODEkl1Fg7 neboer@Test`，那么你添加公钥的方法就是

```shell
set system login user vyos authentication public-keys neboer-vyos key AAAAC3NzaC1lZDI1NTE5AAAAICLhAOgh5+44Os4k6lyVOd60FHYpwSFKQ/dODEkl1Fg7
set system login user <username> authentication public-keys neboer-vyos type ssh-ed25519
```

这样，你就可以直接用ssh通过密钥快速登录VyOS，完成认证。

## 写在后面

感谢 libvirt 提供了非常好的实验平台，完成这样一个实验确实不容易，在libvirt中创建和管理网络接口非常方便，很符合直觉。另外Linux的网络栈也清晰易懂，文档全面，为本实验提供了很多支持。

最后也是非常感谢Krusl提供了大量的关于nftables的学习材料，以及耐心而细致的、针对Linux网络栈的讲解，在我的研究的过程中提供了非常多的帮助。感谢Eibon提供的鼓励与支持，主要此文章中提到的想法就是为了解决Eibon家网络出现的问题——公开服务与自用服务的隔离。

非常感谢Laffey提供虚拟机愿意对VyOS进行测试部署，运行稳定。同时感谢 [NOTvyos package repository](https://vyos.tnyzeq.icu/) 提供的LTS稳定版镜像的构建方法——虽然现在VyOS再也不会提供LTS版本的源代码了，但您的工作意义重大，非常感谢。

当然，也感谢VyOS开发者。虽然VyOS自身有非常多的问题，比如对LTS版本镜像予以保密之类的，但它还是一个非常好的软路由系统，虽然我承认它的开发者确实有些抽象，不过也是“好用，能用”的级别，最起码做我们的网络实验足够了。

再次感谢大家的支持，各位再见。
