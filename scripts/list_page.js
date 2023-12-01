// https://hexo.io/zh-cn/docs/variables.html#%E9%A1%B5%E9%9D%A2%E5%8F%98%E9%87%8F
var pagination = require('hexo-pagination');

hexo.extend.generator.register('/list', function(locals){
    return pagination('/list', locals.posts.filter(p => p.type === "blog").sort('date', 'desc'), {
        perPage: 5,
        layout: ['list'],
        data: {}
    });
});