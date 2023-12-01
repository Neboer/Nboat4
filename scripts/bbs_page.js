// https://hexo.io/zh-cn/docs/variables.html#%E9%A1%B5%E9%9D%A2%E5%8F%98%E9%87%8F
var pagination = require('hexo-pagination');

hexo.extend.generator.register('/board', function(locals){
    return pagination('/board', locals.posts.filter(p => p.type === "bbs").sort('date', 'desc'), {
        perPage: 5,
        layout: ['board'],
        data: {}
    });
});