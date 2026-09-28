# 小家库存 PWA

一个低成本、手机优先的共享收纳和库存工具。默认离线可用，配置 Supabase 免费项目后可以让你和室友在两台手机上同步同一份数据。

## 本地试用

直接打开 `index.html` 即可试用。为了测试 PWA 安装和离线缓存，建议用一个静态服务器打开。

如果你的系统里有 Python：

```powershell
python -m http.server 8080
```

如果使用 Codex bundled Python：

```powershell
& 'C:\Users\28690\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m http.server 8080
```

然后访问 `http://localhost:8080`。

## 免费同步配置

Supabase 不需要下载客户端，直接使用网页版控制台即可。

1. 打开 `https://supabase.com/dashboard`，注册或登录。
2. 点击 `New project`，选择免费计划，创建一个项目。
3. 进入项目后打开左侧 `SQL Editor`。
4. 新建一个 query，把 `supabase-schema.sql` 的内容复制进去并执行。
5. 如果想在 Supabase 后台用表格方式浏览物品，再新建一个 query，把 `supabase-views.sql` 的内容复制进去并执行。
6. 打开 `Project Settings` -> `API Keys`，复制 `Project URL` 和 `Publishable key`。如果界面显示的是旧版 key，也可以复制 `anon public` key。
7. 打开 `config.js`，改成下面这样：

```js
window.HOME_INVENTORY_SYNC = {
  supabaseUrl: "https://你的项目.supabase.co",
  supabaseAnonKey: "你的 Publishable key 或 anon public key",
  householdId: "home-2026-改成一串不容易猜到的名字"
};
```

8. 重新部署这些静态文件到 Cloudflare Pages、Vercel、Netlify 或 GitHub Pages。
9. 用手机打开部署后的网址，新增或修改物品后会写入 Supabase。

如果你之前已经在本机或局域网页面录了一些数据，先在旧页面的 `设置` 里导出，再到部署后的新网址导入一次。不同网址的浏览器本地数据不会自动互通。

## Supabase 后台浏览

执行 `supabase-views.sql` 后，可以在 Supabase 左侧 `Table Editor` 里查看这些视图：

- `inventory_items_view`：一行一个物品，适合搜索和筛选
- `inventory_replenish_view`：只显示需要补货的物品
- `inventory_locations_view`：按位置汇总，每个位置有多少件物品

这些 view 是只读看板。日常新增、修改、删除仍然建议在 PWA 页面里完成。

## 当前功能

- 空间视图，点击收纳容器直接查看内部物品
- 物品详情面板，含位置、余量、品牌、规格、日期等资料
- 物品分类管理
- 位置记录和按位置查看
- 数量和低库存提醒
- 搜索物品、分类、位置
- 极简新增和一键加减数量
- 本机导入导出
- PWA 安装和离线缓存
- Supabase 免费同步适配

## 注意

`supabase-schema.sql` 里的策略为了方便两个人免费同步，默认允许匿名访问表里的共享数据。自用问题不大，但不要把同一个 Supabase 项目开放给陌生人使用。以后如果要多人长期使用，建议加邮箱登录和按用户授权。
