---
title: Man8S CTR 完全指南
title_url: complete-instruction-of-man8s-ctr
type: blog
date: 2026-02-15
updated: 2026-02-15
tags: 
  - Man8S
  - k8s
  - docker
  - containerd
  - yggdrasil
categories:

mark: 50
---
# Man8S CTR 完全指南

> Man8S CTR 是最新的Man8S规范和软件工具链生态的标准。通过阅读本指南，您将学会使用Man8S进行规范、稳定、便捷的容器化服务部署。

## 为什么要使用Man8S部署软件

Man8S 是极简主义的 k8s 平替。

Man8S 提供 k8s 的基础功能，比如配置统一管理，镜像统一部署，数据的存储与迁移……但同时Man8S也秉持着极简的设计，没有臃肿的软件，复杂的配置及眼花缭乱的功能，我们只有核心的几个元件——containerd/nerdctl 提供容器编排，yggdrasil 提供组网VPN，cni-plugins 提供基础的容器网络功能，yggoverlay 将容器连接至VPN网络中，多说还需要一个rsync实现数据传输和nftables提供防火墙功能，除此之外，不再需要更多的东西了。所有的软件都是来自Linux开源社区，这种简单的设计却提供了相当靠谱的功能，可以让你方便的使用多个主机部署服务，构建并管理庞大的容器网络，好极了。

本文默认读者应该具有安装、配置和运行Docker及使用Docker Compose管理容器的能力。应该熟悉Docker中的各种概念，比如挂载、端口等等。

## 前置知识

在开始学习Man8S之前，你必须先了解这些概念：

### containerd 、 nerdctl与docker

containerd是容器编排系统，nerdctl 是一个类似docker命令的、以containerd为目标后端（而非docker）的管理工具，提供与docker cli相似的命令接口。nerdctl 的用法与 docker 命令几乎完全一致，对于Man8S的用户来说，可以认为 nerdctl/containerd 就是 docker/docker-daemon，使用相同的理解方式来理解这两个软件即可。

### CNI 与Linux网络名字空间(Network Namespace)

Docker中，容器的组网往往通过同网桥通信来实现，但是Man8S所依赖的containerd/nerdctl 则使用 CNI 来进行组网。

containerd 本身只提供容器编排功能，并不负责让编排的容器获得网络访问能力，所以每次创建好一个容器之后，都执行一个配置的CNI插件来完成容器网络的配置。

Linux网络名字空间是一种隔离网络环境的方法，可以在一个主机中模拟出多个不同的网络环境，每个网络环境都可以有独立的网络设备，分配独立的地址。CNI插件的作用就是在containerd/nerdctl给每个容器分配的独立的网络名字空间中创建网络设备并将其连接至主机网络中，使容器网络可以正常工作。

### yggdrasil

yggdrasil是一种实验性的组网工具，它可以让每个运行yggdrasil的主机获取到一个200::/7的IPv6地址，并且可以通过yggdrasil创建的虚拟接口使用这个地址进行互相访问。yggdrasil 除了给了主机一个IPv6地址，还给了主机一个IPv6地址段（通常为 300:: …… ::/64），通过这个地址段也可以实现主机之间的互相访问。

### rsync

Man8S 的灵活性是谁提供的？答——rsync。Man8S 大量使用 rsync 用于主机之间的数据传输，传输容器配置、容器数据，将本地的配置同步到远程，将一台主机的配置与数据发送到另一台主机……可以说，正是因为有了 rsync 这个强大的工具才保证了Man8S的稳定可靠的工作。

rsync 是一个极其、极其强大的软件，我们会在后文的使用方法中反复提到rsync，所以请你务必学会这个软件的用法。

## Man8S 的设计理念

Man8S 使用 containerd 作为容器编排系统，通过操作 nerdctl 来部署容器，整体上与docker并没太大区别。这样做的目的是，让Man8S尽可能标准的部署容器，获得容器化部署的所有好处。 containerd 是一个非常成熟的容器编排系统，它可能是所有容器玩家的最佳选择，也是最专业的、最可配置的、最稳定可靠的选择。

但是containerd只是毛坯房，Man8S 只是在底层利用containerd实现容器托管编排而已，在顶层，Man8S 有着不同于 docker的、自己的一套概念。

### 路径功能分离

Man8S 最重要的特点就是，将一个容器分成了三个部分来看待：容器镜像、容器数据与容器配置。

- 容器镜像：容器的基础部分，包含了容器软件正常运行所需的所有支持库、运行时等等文件，一般就是从docker hub上拉下来的那个mirror。
- 容器数据：容器运行时过程中产生的、需要持久化存储在硬盘上的数据。
  - 日志：log之类的日志文件
  - 缓存：cache之类的缓存，注意实在不重要的缓存不应该持久化存储，让它们随着容器生命周期自然消失就好。
  - 存储：各种数据库文件等。
- 容器配置：小体积、大作用的，可能需要反复修改的，会对容器运行产生重要影响的配置文件。

### 容器自动组网

Man8S 的容器，一般都会自动连接至全体容器组成的一个巨大的ygg网络中。每个容器都有一个独一无二的ygg IPv6地址，可以访问到同一组网下的任何一个其他容器。这样，就轻松实现了跨主机的容器互联。这整个过程对容器来说是完全透明的，容器不需要安装VPN软件，只需要通过一个Man8S开发的yggoverlay CNI插件，就可以自动被分配到一个固定的、仅与容器名字有关的网络地址后缀，这个后缀与主机的ygg前缀组合起来就形成了这个容器在整个ygg网络中的唯一地址。

容器软件可以直接使用这个地址，比如监听这个地址，或者向其他容器的ygg地址发送数据。yggoverlay插件会自动配置容器，让所有ygg的流量使用容器的ygg地址发出。

容器的ygg地址仅与容器的名字与容器的主机前缀有关，一个固定的容器名字一定对应一个固定的ygg后缀，因此主机+容器名字就对应一个完整的ygg地址。

### 容器名唯一标识

在Man8S里，容器的名字Name就是容器的唯一标识，而非 containerd/docker 中的容器ID。虽然每个Man8S容器都唯一对应一个containerd容器，但是用户可能会更新这个Man8S容器的运行配置，而在重新应用这个配置的时候，原来的container被摧毁，新的container被创建，原来和新的容器肯定有着不同的ID，但它们必须得有一个相同的名字Name，才能正确的被Man8S识别为同一个容器。

### Man8S 配置对应 compose service

每个Man8S容器都有一个Man8S配置container.yaml，里面记录了容器的挂载信息、环境变量配置、端口映射、DNS服务器、是否自动启动等等信息。每个Man8S配置都可以在一个Man8S主机中唯一的转换成一个只有一个服务的docker compose文件，然后nerdctl直接读取这个文件并创建对应的容器，就实现了Man8S配置到nerdctl容器的对应。实际上，还可以在Man8S配置中直接写其他compose配置，这些配置会保留到compose配置中。

### 支持IPv6、nftables与btrfs

与Docker不同（实际上现在Docker也开始支持了），Man8S 充分的利用了CNI插件 bridge 与 portmap，完全支持IPv6与nftables。首先，我们会给每个容器分配IPv6 NAT地址，容器可以直接访问其他的IPv6地址，容器也可以监听到自己的IPv6地址上，配置好portmap，就可以把自己的端口暴露到主机的IPv6地址上了。

Man8S非常建议（并且默认就是）使用nftables配置。Man8S的容器SNAT与DNAT行为都是由nftables控制的，行为非常干净确定，nftables配置很容易管理，并且可以和自定义的nftables配置协同工作，互不干扰。注意如果配置得当，Man8S是完全不需要依赖iptables的，不会在其中留下一条规则。

Man8S推荐使用containerd的btrfs snapshotter，当然这是主机文件系统使用btrfs的情况下。

## Man8S的安装

讲完这些，那接下来就可以说说如何安装Man8S了。这里只介绍archlinux的安装方法，其他发行版我们还没有打包。

首先安装软件，需要 containerd nerdctl yggdrasil cni-plugins，然后安装Man8S的专门工具 mbctl、yggoverlay。其中yggoverlay会带两个CNI配置文件，不再需要配置CNI插件。

1. 先启动配置yggdrasil，连接到你的主网络。

2. 然后配置 nerdctl

   /etc/nerdctl/nerdctl.toml

   ```toml
   namespace      = "man8s.io"
   snapshotter    = "btrfs"
   ```

3. 配置mbctl

   /etc/mbctl/config.yaml

   ```yaml
   yggaddr: 200:7547:78fb:902a:9a09:9bff:f966:89a7
   ```

   这个yggaddr 就是主机的 yggdrasil地址，mbctl使用它计算容器的真实地址。

这样Man8S就装好了，是不是很方便？Man8S 使用独立的 man8s.io 名字空间，不会影响到其他容器。

## Man8S 的挂载系统

在开始使用Man8S之前，请容许我最后向你介绍一下Man8S的挂载系统是如何工作的。可以说Man8S的特殊的挂载系统使得Man8S的配置与数据是一体实现的，而理解这个挂载系统是学会配置Man8S的前提。

Man8S几乎所有的内容（包括配置与数据）都保存在 /var/lib/man8s 下。在 /var/lib/man8s 下仅有如下五个目录（并且没有任何其他文件）：conf、data、plugin、log、cache、socket。这些目录的目的都显而易见，其中每个目录都是专门装一类文件的。

比如，对于一个PostgreSQL数据库容器nerchat-pgsql而言，它的配置项如下：

```yaml
mount: 
  conf:
    /etc/postgresql: {}
  data:
    /var/lib/postgresql/data:
      owner: [999, 999]
  socket:
    /var/run/postgresql:
      owner: [999, 999]
```



其目录结构如下：

- /var/lib/man8s/
  - conf/nerchat-pgsql/
    - container.yaml
    - etc/postgresql/
      - postgresql.conf
      - pg_hba.conf
      - ...
  - data/nerchat-pgsql/
    - var/lib/postgresql/data/
      - PG_VERSION
      - pg_logical
      - ...
  - socket/nerchat-pgsql/
    - var/run/postgresql/.s.PGSQL.5432

我们接下来就以这个数据库容器nerchat-pgsql为例，详细讲解一下Man8S的挂载系统。

- /var/lib/man8s/<挂载类型>/<容器名> 是容器需要挂载的文件，它可以是容器的配置/数据，也可以是日志/socket等等。

- /var/lib/man8s/conf/<容器名>/container.yaml 是必须有的一个文件，它标识了一个容器的完整配置。这个配置的具体写法会在后面给出。

- /var/lib/man8s/conf/nerchat-pgsql/etc/postgresql 实际上就是容器内的 /etc/postgresql 。这个路径会被自动挂载进容器是因为容器配置container.yaml中有如下内容：

  ```yaml
  mount: 
    conf:
      /etc/postgresql: {}
  ```

  这个 /etc/postgresql 键的值是空的，空值表示默认设置。在默认设置下，它实际上等同于

  ```yaml
  mount: 
    conf:
      /etc/postgresql:
        source: /var/lib/man8s/conf/nerchat-pgsql/etc/postgresql
        ...
  ```

  路径映射：主机 /var/lib/man8s/conf/nerchat-pgsql/etc/postgresql -> 容器 /etc/postgresql

  其他的展开配置不重要，只需要关心 source 这一项。可以看到 source 的默认值就是 /var/lib/man8s/conf/nerchat-pgsql/etc/postgresql 这个路径，所以容器在构建时，会自动将配置路径bind到容器内部。

- /var/lib/man8s/data/nerchat-pgsql/var/lib/postgresql/data 这个路径下是pgsql的数据。同样的，它在配置文件中的配置是

  ```yaml
  mount:
    data:
      /var/lib/postgresql/data:
        owner: [999, 999]
  ```

  其中 owner 对应这个目录的 uid 和 gid，如果不指定则默认都是0(root)。
  
  containerd 并没有做UID/GID的隔离，因此containerd中运行的软件使用的uid/gid本质上就是主机中的uid/gid。而且 bind mount 会将主机中的所有权直通容器，因此实际上像pgsql这种容器的运行用户是999，为了让它有正确的权限读写数据目录，主机中数据目录的bind source的uid/gid必须也是999。
  
  owner选项中指定的UID/GID只会应用于目标挂载点的一个文件夹/文件之中，并不会递归应用至子目录。这一点需要注意：如果你迁移其他配置到这里，请务必提前chown设置好挂载点目录文件的权限。
  
  如果不希望将数据存储在默认位置，比如这个Pgsql需要将数据专门存储在另外一个挂载点上，那么就需要指定其他的source。
  
  ```yaml
  mount:
    data:
      /var/lib/postgresql/data:
        owner: [999, 999]
        source: /mnt/postgresql
  ```
  
  如果这个位置不存在或者权限不正确，在`mbctl run`创建容器的时候，会将挂载点实现。
  
- 如果挂载的目标不是文件夹而是文件，则需要挂载选项指定 file: true。注意这种file: true的挂载不会自动创建挂载点，需要确保在创建容器时挂载的文件是存在的。

- 有的时候，容器之间需要共享挂载路径。比如 pgsql 的 socket 挂载点，需要被 synapse 容器使用，这样 synapse 才可以通过这个 socket 文件对数据库进行读写操作 （请注意权限问题，containerd 的所有权限设置都是与主机完全一致的，因此请你检查 synapse 容器是否有足够的权限读取 pgsql 的 socket 挂载点及socket文件。因为运行Pgsql的用户与Synapse的用户不会相同，因此Pgsql的socket文件的权限必须是任何人可读的。一般情况下可以通过Postgresql数据库的设置来指定）。

  synapse的挂载配置如下：

  ```yaml
  mount:
    conf:
      /config: {}
    log: 
      /log:
        owner: [991, 991]
    data:
      /media_store:
        owner: [991, 991]
    socket: 
      /db_socket:
        source: nerchat-pgsql:/var/run/postgresql
      /synapse_socket:
        owner: [991, 991]
  require:
    - nerchat-pgsql
  ```

  可以看到，socket类型下的挂载配置里写了 `source: nerchat-pgsql:/var/run/postgresql`，它的含义是：这个容器中的`/db_socket`挂载点的源路径是nerchat-pgsql容器配置中/var/run/postgresql挂载点的源路径。

  但是，这个配置并不是可以随便使用的，如果你使用了某个容器作为挂载源，那么就必须在require中写明容器之间的依赖关系。require表示，此容器依赖另一容器运行。

  这样配好之后，Synapse就可以使用 /db_socket/.s.PGSQL.5432 这个socket文件了。

以上，就是Man8S的挂载系统的配置要点。Man8S的配置就像Nginx一样复杂，因此，非常建议使用rsync同步Man8S的配置到本地，修改好之后再上传到服务器。对于Windows用户，可以考虑使用wsl之类的环境进行配置管理，还是非常方便的。

## Man8S 容器的配置

了解了最复杂的挂载配置之后，理解容器其他的配置就非常简单了。一个典型的 Man8S Config 一般是这样的：

容器：relink-nginx

```yaml
# yaml-language-server: $schema=http://share.neboer.site:4000/public/index/jsonschemas/mbcontainerconf-schema.json

image: registry.neboer.site/library/nginx
enable_ygg: true
autostart: true
mount:
  data:
    /etc/nginx:
      source: /etc/nginx
    /var/lib/secrets/:
      source: /var/lib/secrets
    /srv/mirror/archlinuxus-mirror:
      source: /srv/mirror/archlinuxus-mirror
  log:
    /var/log/nginx:
      source: /var/log/nginx
port: 
  - [80, 80]
  - [443, 443]
  - [8448, 8448]
dns: relink-pdns-recursor
local_access:
  - nchat-element
```

我们接下来从上到下开始解释：

- yaml-language-server 用于给VSCode等IDE环境提供yaml编辑补全

- image 就是容器镜像的地址

- enable_ygg: true 一定要有，目前不支持 enable_ygg 为其他值。

- autostart 表示容器是否要自动启动， 设置为 true 容器除非被 stop 否则会一直尝试自动启动，设置为 false 则容器不会自动启动。

- mount 为上文介绍的挂载选项

- port 这里，每项表示 hostport containerport is_udp，描述主机端口到容器内端口的映射关系，第三个值如果设置，为 true 是 udp，为 false 是tcp，默认是 tcp。

- dns 可以指定一个IP/IPv6地址，也可以指定一个容器的名字作为DNS服务器。

- local_access 指定一个列表，其中的所有容器的域名都会被添加进容器的hosts文件中。比如这里配置了 nchat-element 代表可以在这个 Nginx 容器中访问 nchat-element.man8s.local 这个域名直接对应到 nchat-element 的ygg地址，方便配置。local_access 会有一个默认值 relink-nginx.man8s.local 代表当前容器的ygg地址，当前容器的ygg地址是不需要配置就可以自动获取的，local_access 的地址也不需要写进 require 中。

- 如果要指定启动命令，比如要将启动命令更换成 sleep infinity 让容器启动但不做任何事情，方便我们随后进入容器内部调试，可以添加如下一行

  ```yaml
  extra_compose_configs: 
    entrypoint: ["sleep", "infinity"]
  ```

  这样的容器执行mbctl run之后会运行，但是不会启动任何软件。这个时候可以进入容器进行一些调试。

  如果只是需要修改启动的命令，比如某些容器需要用户手动传递参数，则可以使用 command 选项，

  ```yaml
  extra_compose_configs: 
    command: ["gunicorn", "powerdnsadmin:create_app()", "--bind", "[::]:8080"]
  ```

  这些都是docker compose原生支持的参数，通过 extra_compose_configs 传递进容器，所有compose参数都可以直接传递进去，除了少数的限制之外——extra_compose_configs 不支持所有的 compose 选项，其中有一些选项会与 Man8S 冲突。冲突的选项有：

  image, container_name, extra_hosts, network, mount/volume, restart, ports, networks, hostname (因为yggoverlay的限制，hostname必须与容器名一致并且为自动设置，不允许修改。)



## mbctl 的使用方法

mbctl 是Man8S的管理工具，可以用来管理一个Man8S主机。使用时，需要安装到目标主机之中。

### mbctl list

mbctl list 可以列出目前已经配置的所有容器。这包括那些已经配置但没有启动的容器。如果你按上述说法配好了一些容器并将带有 /var/lib/man8s/conf/<容器名>/container.yaml 的配置上传到了远程服务器的文件夹中，那么 mbctl list 就会显示出你的所有容器。

```
Container          Image                Status         AutoStart        YggAddr
relink-pdns-auth   powerdns/pdns-auth-50         Up    Yes     300:7547:78fb:902a:4dcc:274f:f9fb:4569
relink-pdns-ls     powerdns/lightningstream      Up    Yes     300:7547:78fb:902a:e2c7:fe72:193d:1a9
relink-pdns-recursor        powerdns/pdns-recursor-54     Up    Yes     300:7547:78fb:902a:874a:2e22:fa0d:d5d7
powerdns-admin     powerdnsadmin/pda-legacy:master        Up    Yes     300:7547:78fb:902a:d516:c2d8:6667:ea68
relink-nginx       library/nginx        Up    Yes     300:7547:78fb:902a:c078:fb01:c413:a24c
relink-pgsql       library/postgres:18           Up    Yes     300:7547:78fb:902a:979e:744a:c47e:4dfb
nchat-element      vectorim/element-web          Never          Yes     300:7547:78fb:902a:7f53:42ef:2c2b:cee9
relink-redis       library/redis        Up    Yes     300:7547:78fb:902a:cc32:b73c:a160:5bbc
us-keycloak        keycloak/keycloak:latest      Up    Yes     300:7547:78fb:902a:d4af:b89d:17f9:d986
us-outline         outlinewiki/outline           Up    Yes     300:7547:78fb:902a:e210:e0e0:283c:f434
us-gitea           gitea:latest-rootless         Up    Yes     300:7547:78fb:902a:60e0:f5a0:1817:1156
```

如果一个容器你配置了但是从来没有运行，那么它的 Status 就是 Never ，表示容器从未运行过。比如上述容器中， nchat-element 容器我们便从未运行过。

如果想要运行此容器，只需要执行 `mbctl run nchat-element` 即可启动。

### mbctl run

mbctl 的主要命令就是 mbctl run。具体的使用方法是 mbctl run relink-nginx ，就可以将一个Man8S配置项变成一个运行中的容器了。

在执行此命令之后，mbctl 将会把正在运行中的 nchat-element 容器关闭并删除（如果存在的话），然后根据配置文件重建一个 nchat-element 容器并启动。同时，终端将会显示本次启动容器的日志，可以按Ctrl+C关闭此软件，容器就可以在后台开始运行了。

### mbctl shell

进入一个容器的内部shell，有bash时会执行bash，无bash时会执行sh。如果使用 mbctl shell --network，则只会进入容器的网络名字空间并以容器root身份执行主机中的 bash，接下来就可以在里面进行网络调试。

### mbctl ...

mbctl 的其他命令可以直接1:1的映射到 nerdctl，相当于是nerdctl的方便代理。比如执行 mbctl ps -a 就相当于执行 nerdctl ps -a，结果是一样的。

比如 mbctl start xxx 就可以启动一个停止的容器，mbctl stop xxx 可以停止一个容器等等。可以把 mbctl 看成是一个覆盖了一些子命令的 nerdctl。

因为 mbctl 的容器名字与 nerdctl 中的 Name 是完全一样的，所以你完全可以把一个用 mbctl 管理的 Man8S 容器看成是一个nerdctl管理的containerd容器，它们是完全等价的——除了 mbctl 并不承认 Container ID 这一点。

## Work With mbctl

我们推荐的工作流是：

1. 本地编辑服务器配置文件

2. 使用 rsync 将本地配置推送到目标服务器

3. 在目标服务器用mbctl run xxx创建容器

   如果更新了一个目标容器的配置，推送上去之后使用 mbctl run xxx 重新创建容器。

4. 对于配置好的系统，可以使用的配置文件，使用git做版本控制将配置与插件存储进git进行版本控制与管理。

本地编辑服务器的配置文件，主要就是编辑 conf 文件夹下的那些内容。对于多个主机来说，我们一般推荐创建一个Man8S项目配置文件夹，内容如下：

untilsoftware-man8s-configs/

- relink
  - conf
    - nerchat-pgsql
      - container.yaml
      - etc/postgresql/
    - nerchat-synapse
      - container.yaml
      - etc/synapse/homeserver.yaml
- tarrey
  - conf
    - tarrey-nginx
    - powerdns-admin
- lothric
  - conf
    - us-prometheus
      - etc/prometheus/prometheus.yaml
    - us-grafana

这样一来，我们把每个服务器的配置都保存在了它对应的文件夹。将本地的配置文件传输至远程，需要使用如下命令：

（在untilsoftware-man8s-configs/文件夹中执行）

```bash
rsync -avz --no-owner --no-group --no-perms --delete --include /conf --include /plugin relink/ root@relink.neboer.site:/var/lib/man8s
```

以上命令会将本地relink文件夹下的 conf 和 plugin 两个文件夹传输到远程 /var/lib/man8s/ 下，并删除这两个文件夹中多余的内容。

对于一个已经存在了Man8S配置的主机，将其中的Man8S配置与插件同步到本地而不同步任何其他文件夹（如data）需要使用命令

```bash
rsync -avz --no-owner --no-group --no-perms --delete --include /conf --include /plugin root@relink.neboer.site:/var/lib/man8s/ relink
```

这样，就可以将远程文件夹中的 /var/lib/man8s/conf 和 /var/lib/man8s/plugin 两个文件夹同步到本地的 relink/conf relink/plugin 了。

### 复杂配置的管理

对于配置极其复杂的软件，比如 Nginx，我们推荐将其配置作为软件数据进行管理。

```yaml
mount:
  data:
    /etc/nginx:
      source: /etc/nginx
    /var/lib/secrets/:
      source: /var/lib/secrets
    /srv/mirror/archlinuxus-mirror:
      source: /srv/mirror/archlinuxus-mirror
  log:
    /var/log/nginx:
      source: /var/log/nginx
```

对一个Nginx容器，使用上述配置，将Nginx的配置存进系统的 /etc/nginx，然后将Nginx的配置在另外的项目中管理。

untilsoftware-nginx-configs/

- relink
  - nginx.conf
  - sites-available/
    - nerchat-synapse.conf
    - us-gitea.conf
  - sites-enabled/
    - nerchat-synapse.conf (-> ../sites-available/nerchat-synapse.conf)
  - streams-available/
  - streams-enabled/
- tarrey
  - nginx.conf
  - sites-available/
    - nerchat-synapse.conf
    - us-gitea.conf
  - sites-enabled/
    - nerchat-synapse.conf (-> ../sites-available/nerchat-synapse.conf)
  - streams-available/
    - mc-proxy.conf
  - streams-enabled/
    - mc-proxy.conf (-> ../streams-available/mc-proxy.conf)
- lothric

注意，对于 sites-enabled 类似的符号链接配置，一定要使用相对路径链接，这样可以确保rsync同步后的符号链接依然可以正确指向正确的文件。

使用时，需要使用 rsync 命令推送至远程服务器。先 cd 到 untilsoftware-nginx-configs/ 文件夹，然后

```bash
rsync -avz --no-owner --no-group --no-perms --delete tarrey/ root@tarrey.neboer.site:/etc/nginx/
```

这样就可以同步了。如果要拉取目标Nginx配置到本地，只需要反过来：

```bash
rsync -avz --no-owner --no-group --no-perms --delete root@tarrey.neboer.site:/etc/nginx/ tarrey/
```

### 软件更新与迁移

Man8S配置分离有一个极好的好处，就是软件的更新和迁移从未如此简单。

如果一个镜像有更新（比如latest推送了更新的版本），而tag没有变化（latest还是latest），那么可以通过强制重新拉取来更新容器镜像：

```bash
mbctl run --pull relink-nginx
```

Man8S会尝试拉取目标镜像，拉取成功之后将本地容器停止，升级其镜像，然后重新创建一个使用目标镜像的新容器代替之。

如果要迁移一个Man8S软件到另一台主机，只需要将这个容器的Man8S配置复制到目标主机，然后在目标主机上 run 即可复现此容器。如果容器还有数据、插件等等，使用rsync一并迁移之。

比如，将 relink 中的 nerchat-synapse 容器整个迁移到 lothric 中，

cd 到拥有容器的主机的 /var/lib/man8s 目录，执行

```bash
rsync -aAXHvz --numeric-ids  --include /*/nerchat-synapse  /var/lib/man8s/  root@lothric.neboer.site:/var/lib/man8s
```

-aAXH 与 --numeric-ids 这些标签表示尽可能保持所有的目录信息，甚至包括 xattrs （一些数据库目录如果存储进btrfs则需要写xattr关闭CoW，不过这个一般不需要担心），同时numeric-ids保证传输到目标路径后的权限数字是一致的，不会因为目标容器的同名用户与源容器的id不一致而修改容器权限uid/gid数字位。`--include /*/nerchat-synapse` 只迁移nerchat-synapse的所有挂载点。

## 迁移到Man8S

将你的软件迁移到Man8S，其实非常简单。你需要考虑如下问题：

1. 你使用的软件有没有高质量、适合Man8S的Docker镜像？
2. 软件的配置在哪？你的软件的数据在哪？日志在哪？你是否patch了软件的某些部分（如果是，请在plugin中覆盖）？如果软件已经有数据，你只需要将这些数据迁移至Man8S配置文件中指定的源路径或直接将它们移动到Man8S软件默认的data路径。
3. 你的软件依赖数据库吗？依赖redis吗？需要Nginx提供转发吗？需要暴露端口对外提供服务吗？
4. 你的软件支持监听IPv6地址吗？（如果不支持后文会有解决方案）

## Man8S 的限制、问题与对策

mbctl 目前只是测试版软件，可能存在bug。Neboer的代码可能不是那么好用，而且Man8S的设计有些过于理想化，在实际工程中需要一些“docker式的妥协“。

### IPv6 监听与请求

不是所有的软件都支持IPv6。Man8S 的服务需要互联互通，其中一大重要需求就是软件需要监听IPv6并请求另一软件的IPv6地址——因为yggdrasil只支持IPv6。

其实说到底，yggdrasil 只支持v6非常非常的何意味啊！其实Man8S没必要局限在yggdrasil的，tailscale也提供这种单主机内网段的功能，或许未来有一天Man8S会支持吧。

实际上，docker部署的软件中，有一小半软件可能都不支持IPv6，其中还有很多提供Nginx内部服务器配置的容器，不会将IPv6监听写进Nginx配置文件中，极其讨厌恶心。

对于这种问题，首先，如果是Nginx不支持监听IPv6，则编写一个plugin覆盖容器内的对应路径的Nginx配置文件，在里面加上对v6地址 :: 的监听就可以了，这是小问题。

如果是软件本身就不支持监听IPv6呢？比如 terraria 服务器，这种情况就相当相当的讨厌了。

我们现在的方案是使用nerdctl创建一个随主机自动启动的socat容器。

比如，有一个容器 fobh-terraria 它只支持IPv4监听7777端口，不监听IPv6 ygg地址。那么我们在启动 fobh-terraria 之后，再额外启动这样一个容器：

```bash
nerdctl run -d --name fobh-terraria-proxy --restart unless-stopped --network container:fobh-terraria   registry.neboer.site/alpine/socat -d -d -ly -lf /dev/stdout   TCP6-LISTEN:8888,fork,reuseaddr   TCP4:127.0.0.1:7777
```

这个 socat 容器运行在 fobh-terraria 相同的网络名字空间中，IPv6监听 8888 端口，转发所有请求至 127.0.0.1:7777。值得一提的是，如果 fobh-terraria 容器重建，那么这个容器也需要重建；如果fobh-terraria容器重启，那么这个容器也需要重启，目前没有什么好的方法可以保证容器之间永远跟随的关系。目前 mbctl 不支持容器复用其他容器的网络名字空间，这是一个巨大的遗憾（Neboer哭给你看）

Neboer在这里真诚的号召所有的开发者，支持IPv6，责任重大！你的一个小小的代码提交，换来的是无穷的方便！

### 权限与权限配置

Man8S 第二大的问题就是权限。

Docker容器一般不对外提供如此多的挂载，这么多的挂载产生了很多的权限问题。其实只要处理得当，一般不会有那么多奇怪的权限问题，所以需要在配置的时候时刻注意权限。有关容器中的用户，一般有三种情况：

1. 很多docker容器可以指定运行时用户的UID/GID，若是如此还好，记得配置一个与文件夹权限相同的UID/GID。

可以通过下面这条命令来查看容器 registry.neboer.site/ryshe/terraria:latest 容器实际运行时使用的用户信息。

```bash
nerdctl run --rm --network none --entrypoint id registry.neboer.site/ryshe/terraria:latest
```

返回的值可以作为容器运行时uid/gid的参考。但是由于很多容器喜欢在运行时或者在entrypoint里切换用户（不受docker run中user参数的影响），所以实际还是需要注意容器运行进程的真实用户。必要时可以结合网络搜索的方法调查一下。

docker容器确实非常非常的不规范……

### 容器数据与容器配置混放

说的就是你 postgresql。

很多时候，一个容器的配置和容器的数据是说不清、分不清的，比如QBittorrent的server.conf，它即可以被WebUI管理，也可以在文件中完成配置。

这个时候，我们推荐如果软件本身提供配置备份导出的功能（比如Qbittorrent有WebUI，支持配置导出和还原），那么就将这种配置视为软件数据。

像PostgreSQL这种软件，它的配置postgresql.conf和数据 data 都存放在相同的 /var/lib/postgres 下，这种时候不容易把配置和数据分离。但是因为postgresql是支持传递命令行参数设置配置文件路径，而又可以在postgresql.conf中指定pg_hba.conf等其他配置文件的路径，因此可以勉强将它的配置与容器数据分开。

在它的container.yaml中写如下配置：

```yaml
mount: 
  conf:
    /etc/postgresql: {}
extra_compose_configs: 
  command: "-c config_file=/etc/postgresql/postgresql.conf"
```

然后在 etc/postgresql/postgresql.conf 中

```ini
data_directory = '/var/lib/postgresql/data'
hba_file = '/etc/postgresql/pg_hba.conf'
ident_file = '/etc/postgresql/pg_ident.conf'
```

这就完成了。

### 软件 bug 及复杂的网络栈

Man8S具有复杂的网络栈。每个Man8S容器会被分配到三个地址，IPv4地址、IPv6地址和ygg地址。ygg地址是由yggoverlay插件分配的，它偶尔可能会因为各种难以理解的原因而报错。如果终端报告说无法添加ygg网络到容器，这个时候容器往往已经启动了，但是ygg网络没有添加成功。一般等几秒钟重启容器就可以修复这个错误。这个问题多发生在重建Man8S容器的过程中，目前具体的解决方案还在研究中。

Man8S使用的bridge CNI插件支持nftables，但是它在清理的过程中好像不是很能将nftables配置清理干净。有时候会残留很多诸如下面这种的规则无法清理。具体的原因还在调查之中。

nft list ruleset

```
ip saddr 10.10.2.103 ip daddr != 10.10.2.0/24 masquerade comment "bebdc5bd8afde76b-58e660d5dca9b686, net: man8yggbr, if: eth0, id: man8s.io-e7f4b5d9734cdc8ae60a2a959e77b29690ad3082dae764b263b1a7"
ip6 saddr 3ffe:ffff:0:1ff::c1 ip6 daddr != 3ffe:ffff:0:1ff::/64 masquerade comment "bebdc5bd8afde76b-58e660d5dca9b686, net: man8yggbr, if: eth0, id: man8s.io-e7f4b5d9734cdc8ae60a2a959e77b29690ad3082dae764b263b1a7"
```

一般不需要管它，这些多余的配置不会对系统的正常运行产生影响，也不建议手动清理，没用的配置重启后就都不复存在了。

