# procell 数据表目录（自动生成）

> 由 information_schema 生成。行数为统计估算值（TABLE_ROWS）。完整列定义见 `_schema_dump.json`。

> 主键(PRI)与索引列(MUL/UNI)作为"访问路径"列出，便于定位关联与过滤字段。


## procellcn_ — 普诺赛中文站（57 表）

### `procellcn_actdata`

- 说明：活动效果  
- 引擎：InnoDB ｜ 估算行数：54 ｜ 主键：`id`

### `procellcn_activity_information`

- 说明：活动参与用户  
- 引擎：InnoDB ｜ 估算行数：224 ｜ 主键：`id`

### `procellcn_actproduct_code`

- 说明：活动参与识别码  
- 引擎：InnoDB ｜ 估算行数：2115 ｜ 主键：`id`

### `procellcn_article`

- 说明：文章  
- 引擎：InnoDB ｜ 估算行数：351 ｜ 主键：`id`

### `procellcn_banner`

- 说明：轮播  
- 引擎：InnoDB ｜ 估算行数：5 ｜ 主键：`id`

### `procellcn_brochure`

- 说明：宣传册  
- 引擎：InnoDB ｜ 估算行数：44 ｜ 主键：`id`

### `procellcn_cell_culture_medium`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：2543 ｜ 主键：`cat`

### `procellcn_cell_culture_medium_view`

- 说明：VIEW  
- 引擎： ｜ 估算行数：- ｜ 主键：`—`

### `procellcn_cell_function_research`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：56 ｜ 主键：`catid`

### `procellcn_cell_resource_library`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：1779 ｜ 主键：`catid`
 ｜ 索引：`UNI(cat)`

### `procellcn_cell_resource_library_view`

- 说明：VIEW  
- 引擎： ｜ 估算行数：- ｜ 主键：`—`

### `procellcn_city`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：436 ｜ 主键：`id`

### `procellcn_combination`

- 说明：普诺赛套餐活动主表  
- 引擎：InnoDB ｜ 估算行数：3862 ｜ 主键：`id`

### `procellcn_combination_info`

- 说明：普诺赛套餐活动从表  
- 引擎：InnoDB ｜ 估算行数：7667 ｜ 主键：`coid, goodsid`

### `procellcn_composition`

- 说明：成分表  
- 引擎：InnoDB ｜ 估算行数：2329 ｜ 主键：`catid, reorder`

### `procellcn_contacts`

- 说明：联系人信息表，暂未启用  
- 引擎：InnoDB ｜ 估算行数：33 ｜ 主键：`id`

### `procellcn_country`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：241 ｜ 主键：`id, code`

### `procellcn_customer_evaluation`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：69 ｜ 主键：`id`

### `procellcn_customer_recommendations`

- 说明：普诺赛中文网站客户评荐信息表  
- 引擎：InnoDB ｜ 估算行数：341 ｜ 主键：`id`

### `procellcn_faqs`

- 说明：FAQs  
- 引擎：InnoDB ｜ 估算行数：418 ｜ 主键：`id`

### `procellcn_goodstype_erp`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：112 ｜ 主键：`goodstypeid`

### `procellcn_goodstype_web`

- 说明：电商品类website端分类  
- 引擎：InnoDB ｜ 估算行数：30 ｜ 主键：`goodstypeid`

### `procellcn_information`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：21 ｜ 主键：`id`

### `procellcn_information_history`

- 说明：产品资料检索记录  
- 引擎：MyISAM ｜ 估算行数：7761 ｜ 主键：`id`

### `procellcn_literature_hot_school`

- 说明：—  
- 引擎：MyISAM ｜ 估算行数：50 ｜ 主键：`id`

### `procellcn_literature_hotspot_keyword`

- 说明：文献海报，热点-关键词对应关系表  
- 引擎：InnoDB ｜ 估算行数：48 ｜ 主键：`id`

### `procellcn_literature_product`

- 说明：文献与引用产品对照表  
- 引擎：MyISAM ｜ 估算行数：13808 ｜ 主键：`id`
 ｜ 索引：`MUL(year,doi,cat)`

### `procellcn_literature_zhi_liao_wo`

- 说明：源自知了窝的文献的列表  
- 引擎：InnoDB ｜ 估算行数：21610 ｜ 主键：`id`
 ｜ 索引：`UNI(doi); MUL(year,month)`

### `procellcn_menu`

- 说明：菜单  
- 引擎：InnoDB ｜ 估算行数：71 ｜ 主键：`id`

### `procellcn_package_component`

- 说明：组分表  
- 引擎：InnoDB ｜ 估算行数：725 ｜ 主键：`catid, reorder`

### `procellcn_procellcn_cell_function_research_view`

- 说明：VIEW  
- 引擎： ｜ 估算行数：- ｜ 主键：`—`

### `procellcn_procellcn_cell_function_view`

- 说明：VIEW  
- 引擎： ｜ 估算行数：- ｜ 主键：`—`

### `procellcn_procellcn_reagents_view`

- 说明：VIEW  
- 引擎： ｜ 估算行数：- ｜ 主键：`—`

### `procellcn_product_filter`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：0 ｜ 主键：`id`
 ｜ 索引：`MUL(sort_ii)`

### `procellcn_product_filter_new`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：157 ｜ 主键：`id`
 ｜ 索引：`MUL(field)`

### `procellcn_product_formula`

- 说明：普诺赛试剂配方表--展示配方明细  
- 引擎：InnoDB ｜ 估算行数：9066 ｜ 主键：`id`

### `procellcn_product_images`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：9213 ｜ 主键：`catid, reorder`
 ｜ 索引：`MUL(cat)`

### `procellcn_product_main`

- 说明：产品主表  
- 引擎：InnoDB ｜ 估算行数：5054 ｜ 主键：`catid`
 ｜ 索引：`UNI(cat)`

### `procellcn_product_result_photo`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：6895 ｜ 主键：`catid, reorder`

### `procellcn_product_skus`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：8692 ｜ 主键：`goodsid`
 ｜ 索引：`MUL(cat)`

### `procellcn_promotion_products`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：6283 ｜ 主键：`id, catid, act_code`

### `procellcn_publication_amounts`

- 说明：文献数据  
- 引擎：MyISAM ｜ 估算行数：20 ｜ 主键：`id`

### `procellcn_publication_filter`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：43 ｜ 主键：`id`

### `procellcn_publication_lists`

- 说明：文献表，暂时未使用  
- 引擎：MyISAM ｜ 估算行数：54911 ｜ 主键：`id`
 ｜ 索引：`MUL(product_line,doi,year,country,province,unique_id)`

### `procellcn_publication_lists_base_view`

- 说明：VIEW  
- 引擎： ｜ 估算行数：- ｜ 主键：`—`

### `procellcn_publication_new`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：25102 ｜ 主键：`id`
 ｜ 索引：`UNI(title,doi); MUL(product_line,impact,year,country,province,research_area)`

### `procellcn_publication_old_20260701000100`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：23711 ｜ 主键：`id`
 ｜ 索引：`UNI(title,doi); MUL(product_line,impact,year,country,province,research_area)`

### `procellcn_publication_old_20260801000100`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：24037 ｜ 主键：`id`
 ｜ 索引：`UNI(title,doi); MUL(product_line,impact,year,country,province,research_area)`

### `procellcn_reagents`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：436 ｜ 主键：`catid`

### `procellcn_reagents_serum_view`

- 说明：VIEW  
- 引擎： ｜ 估算行数：- ｜ 主键：`—`

### `procellcn_reagents_view`

- 说明：VIEW  
- 引擎： ｜ 估算行数：- ｜ 主键：`—`

### `procellcn_salesman`

- 说明：销售人信息表  
- 引擎：InnoDB ｜ 估算行数：20 ｜ 主键：`id`

### `procellcn_selfprovidedreagents`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：4587 ｜ 主键：`id`

### `procellcn_serum`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：15 ｜ 主键：`catid`

### `procellcn_state`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：146 ｜ 主键：`id`

### `procellcn_videos`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：74 ｜ 主键：`id, catid, reorder`
 ｜ 索引：`MUL(cat)`

### `procellcn_wrong_search_keyword`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：46407 ｜ 主键：`id`


## pricella_ — 普诺赛英文站（50 表）

### `pricella_address`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：154 ｜ 主键：`id`

### `pricella_banner`

- 说明：轮播  
- 引擎：InnoDB ｜ 估算行数：5 ｜ 主键：`id`

### `pricella_blog_blog`

- 说明：博客分类  
- 引擎：InnoDB ｜ 估算行数：13 ｜ 主键：`id`

### `pricella_blog_post`

- 说明：博客文章  
- 引擎：InnoDB ｜ 估算行数：165 ｜ 主键：`id`

### `pricella_brochure`

- 说明：宣传册  
- 引擎：InnoDB ｜ 估算行数：13 ｜ 主键：`id`

### `pricella_cart`

- 说明：购物车  
- 引擎：InnoDB ｜ 估算行数：693 ｜ 主键：`id`

### `pricella_cell_culture_medium`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：2513 ｜ 主键：`catid`

### `pricella_cell_function_research`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：168 ｜ 主键：`catid`

### `pricella_cell_resource_library`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：883 ｜ 主键：`catid`

### `pricella_combination`

- 说明：普诺赛套餐活动主表  
- 引擎：InnoDB ｜ 估算行数：1398 ｜ 主键：`id`

### `pricella_combination_info`

- 说明：普诺赛套餐活动从表  
- 引擎：InnoDB ｜ 估算行数：2789 ｜ 主键：`coid, goodsid`

### `pricella_composition`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：2329 ｜ 主键：`catid, reorder`

### `pricella_country`

- 说明：国家列表  
- 引擎：InnoDB ｜ 估算行数：243 ｜ 主键：`id`

### `pricella_customization_services_request`

- 说明：定制服务申请记录  
- 引擎：InnoDB ｜ 估算行数：3 ｜ 主键：`id`

### `pricella_customized_formula_component`

- 说明：定制配方组分  
- 引擎：InnoDB ｜ 估算行数：328 ｜ 主键：`id`

### `pricella_customized_reagents`

- 说明：定制试剂  
- 引擎：InnoDB ｜ 估算行数：9 ｜ 主键：`id`

### `pricella_delivery`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：3 ｜ 主键：`id`

### `pricella_distributors`

- 说明：代理商  
- 引擎：InnoDB ｜ 估算行数：43 ｜ 主键：`id`

### `pricella_faqs`

- 说明：为暂时复用的procellcn站的FAQS数据，便于开发用的表  
- 引擎：InnoDB ｜ 估算行数：137 ｜ 主键：`id`

### `pricella_formula_component`

- 说明：组分表  
- 引擎：InnoDB ｜ 估算行数：895 ｜ 主键：`id`

### `pricella_goodstype_erp`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：112 ｜ 主键：`goodstypeid`

### `pricella_goodstype_web`

- 说明：电商品类website端分类  
- 引擎：InnoDB ｜ 估算行数：26 ｜ 主键：`goodstypeid`

### `pricella_guides`

- 说明：实验指南基础信息表  
- 引擎：MyISAM ｜ 估算行数：7 ｜ 主键：`id`

### `pricella_mail_list`

- 说明：订阅的邮箱列表  
- 引擎：InnoDB ｜ 估算行数：183 ｜ 主键：`id`

### `pricella_member`

- 说明：用户表  
- 引擎：InnoDB ｜ 估算行数：114 ｜ 主键：`id`
 ｜ 索引：`UNI(username,email); MUL(status)`

### `pricella_menu`

- 说明：菜单  
- 引擎：InnoDB ｜ 估算行数：78 ｜ 主键：`id`

### `pricella_message`

- 说明：留言表  
- 引擎：InnoDB ｜ 估算行数：83 ｜ 主键：`id`

### `pricella_order`

- 说明：订单  
- 引擎：InnoDB ｜ 估算行数：82 ｜ 主键：`id`

### `pricella_package_component`

- 说明：组分表  
- 引擎：InnoDB ｜ 估算行数：725 ｜ 主键：`catid, reorder`

### `pricella_pdf_download_history`

- 说明：实验指南下载历史数据  
- 引擎：InnoDB ｜ 估算行数：1408 ｜ 主键：`id`

### `pricella_pdf_download_history_temp`

- 说明：VIEW  
- 引擎： ｜ 估算行数：- ｜ 主键：`—`

### `pricella_product_filter`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：60 ｜ 主键：`id`
 ｜ 索引：`MUL(sort_ii)`

### `pricella_product_formula`

- 说明：普诺赛试剂配方表--展示配方明细  
- 引擎：InnoDB ｜ 估算行数：9044 ｜ 主键：`id, catid, formula_category_sort, formula_sort`

### `pricella_product_images`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：6930 ｜ 主键：`catid, reorder`

### `pricella_product_main`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：4104 ｜ 主键：`catid`
 ｜ 索引：`UNI(cat)`

### `pricella_product_result_photo`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：16629 ｜ 主键：`catid, reorder`

### `pricella_product_series`

- 说明：组分表  
- 引擎：InnoDB ｜ 估算行数：23 ｜ 主键：`id`

### `pricella_product_skus`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：6871 ｜ 主键：`goodsid`
 ｜ 索引：`MUL(cat)`

### `pricella_publication_amounts`

- 说明：文献数据  
- 引擎：MyISAM ｜ 估算行数：20 ｜ 主键：`id`

### `pricella_publication_lists`

- 说明：—  
- 引擎：MyISAM ｜ 估算行数：54911 ｜ 主键：`id`
 ｜ 索引：`MUL(product_line,year,country)`

### `pricella_publication_lists_base_view`

- 说明：VIEW  
- 引擎： ｜ 估算行数：- ｜ 主键：`—`

### `pricella_reagents`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：426 ｜ 主键：`catid`

### `pricella_sample_request`

- 说明：样品申请表  
- 引擎：InnoDB ｜ 估算行数：115 ｜ 主键：`id`

### `pricella_search_history`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：0 ｜ 主键：`id`
 ｜ 索引：`MUL(addtime)`

### `pricella_self_reagents`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：711 ｜ 主键：`id`

### `pricella_serum`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：14 ｜ 主键：`catid`

### `pricella_state`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：146 ｜ 主键：`id`

### `pricella_webinars_replay`

- 说明：网研回放申请  
- 引擎：InnoDB ｜ 估算行数：1 ｜ 主键：`id`

### `pricella_webinars_request`

- 说明：网研申请  
- 引擎：InnoDB ｜ 估算行数：0 ｜ 主键：`id`

### `pricella_wrong_search_keywords`

- 说明：搜索错词库  
- 引擎：InnoDB ｜ 估算行数：840 ｜ 主键：`id`
 ｜ 索引：`MUL(wrong_words)`
