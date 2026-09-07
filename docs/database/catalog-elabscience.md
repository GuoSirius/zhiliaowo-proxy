# elabscience 数据表目录（自动生成）

> 由 information_schema 生成。行数为统计估算值（TABLE_ROWS）。完整列定义见 `_schema_dump.json`。

> 主键(PRI)与索引列(MUL/UNI)作为"访问路径"列出，便于定位关联与过滤字段。


## elabcn_ — 伊莱瑞特中文站（56 表）

### `elabcn_actdata`

- 说明：活动效果  
- 引擎：InnoDB ｜ 估算行数：20 ｜ 主键：`id`

### `elabcn_article`

- 说明：文章  
- 引擎：InnoDB ｜ 估算行数：20 ｜ 主键：`id`

### `elabcn_banner`

- 说明：轮播  
- 引擎：InnoDB ｜ 估算行数：7 ｜ 主键：`id`

### `elabcn_blog_blog`

- 说明：博客分类  
- 引擎：InnoDB ｜ 估算行数：95 ｜ 主键：`id`

### `elabcn_blog_post`

- 说明：博客文章  
- 引擎：InnoDB ｜ 估算行数：935 ｜ 主键：`id`

### `elabcn_cell_marker`

- 说明：产品分类表  
- 引擎：InnoDB ｜ 估算行数：1366 ｜ 主键：`id, marker_id, abbre, reactivity_id`

### `elabcn_cell_marker_web`

- 说明：产品分类表  
- 引擎：InnoDB ｜ 估算行数：138 ｜ 主键：`marker_id`

### `elabcn_compare`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：266 ｜ 主键：`id`

### `elabcn_conjugate_color`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：24 ｜ 主键：`id`

### `elabcn_customer_recommendations`

- 说明：伊莱瑞特中文网站文献客户评鉴  
- 引擎：InnoDB ｜ 估算行数：684 ｜ 主键：`id`

### `elabcn_distributors`

- 说明：代理商  
- 引擎：InnoDB ｜ 估算行数：0 ｜ 主键：`id`

### `elabcn_elisa_linearity`

- 说明：线性数据  
- 引擎：InnoDB ｜ 估算行数：20517 ｜ 主键：`id`

### `elabcn_elisa_precision`

- 说明：精密度数据  
- 引擎：InnoDB ｜ 估算行数：1357 ｜ 主键：`id, catid`

### `elabcn_elisa_sample_verification`

- 说明：样本验证数据  
- 引擎：InnoDB ｜ 估算行数：0 ｜ 主键：`id`

### `elabcn_elisa_stdcurve`

- 说明：标曲数据  
- 引擎：InnoDB ｜ 估算行数：17599 ｜ 主键：`id`

### `elabcn_event`

- 说明：活动  
- 引擎：InnoDB ｜ 估算行数：20 ｜ 主键：`id`
 ｜ 索引：`MUL(name)`

### `elabcn_faqs`

- 说明：FAQs  
- 引擎：InnoDB ｜ 估算行数：589 ｜ 主键：`id`

### `elabcn_flow_cytometry_platform`

- 说明：View 'elabscience.elabcn_flow_cytometry_platform' references invalid table(s) or column(s) or function(s) or definer/invoker of view lack rights to use them  
- 引擎：VIEW ｜ 估算行数：- ｜ 主键：`—`

### `elabcn_goodstype_erp`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：259 ｜ 主键：`goodstypeid`

### `elabcn_goodstype_web`

- 说明：产品分类表  
- 引擎：InnoDB ｜ 估算行数：78 ｜ 主键：`id, goodstypeid`
 ｜ 索引：`UNI(name_cn)`

### `elabcn_goodstype_web_journal`

- 说明：产品分类表  
- 引擎：InnoDB ｜ 估算行数：0 ｜ 主键：`id`
 ｜ 索引：`UNI(goodstypeid)`

### `elabcn_home`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：8 ｜ 主键：`id`

### `elabcn_industrial_product-删除`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：6192 ｜ 主键：`industrial_catid`
 ｜ 索引：`UNI(industrial_cat)`

### `elabcn_journal_article`

- 说明：VIEW  
- 引擎： ｜ 估算行数：- ｜ 主键：`—`

### `elabcn_kehupingjian`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：109 ｜ 主键：`id`

### `elabcn_product_antibody_and_reagents`

- 说明：抗体类子表  
- 引擎：InnoDB ｜ 估算行数：9610 ｜ 主键：`catid`
 ｜ 索引：`UNI(cat)`

### `elabcn_product_cell_health_detection`

- 说明：细胞功能与代谢测定  
- 引擎：InnoDB ｜ 估算行数：121 ｜ 主键：`catid`
 ｜ 索引：`UNI(cat)`

### `elabcn_product_cell_isolation_and_identification`

- 说明：细胞功能与代谢测定  
- 引擎：InnoDB ｜ 估算行数：34 ｜ 主键：`catid`
 ｜ 索引：`UNI(cat)`

### `elabcn_product_filter`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：45 ｜ 主键：`id`
 ｜ 索引：`MUL(sort_ii)`

### `elabcn_product_filter_journal`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：0 ｜ 主键：`id`
 ｜ 索引：`MUL(sort_ii)`

### `elabcn_product_filter_new`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：2498 ｜ 主键：`id`
 ｜ 索引：`MUL(field)`

### `elabcn_product_images`

- 说明：产品图片信息表  
- 引擎：InnoDB ｜ 估算行数：20983 ｜ 主键：`catid, reorder`

### `elabcn_product_immunoassays`

- 说明：免疫测定试剂盒与试剂  
- 引擎：InnoDB ｜ 估算行数：2380 ｜ 主键：`catid`
 ｜ 索引：`UNI(cat)`

### `elabcn_product_main`

- 说明：产品信息主表  
- 引擎：InnoDB ｜ 估算行数：15329 ｜ 主键：`catid`
 ｜ 索引：`UNI(cat); MUL(sort_i,sort_ii,sort_iii)`

### `elabcn_product_metabolism`

- 说明：细胞功能与代谢测定  
- 引擎：InnoDB ｜ 估算行数：565 ｜ 主键：`catid`
 ｜ 索引：`UNI(cat)`

### `elabcn_product_proteins`

- 说明：蛋白类子表  
- 引擎：InnoDB ｜ 估算行数：3862 ｜ 主键：`catid`
 ｜ 索引：`UNI(cat)`

### `elabcn_product_result_photo`

- 说明：产品图片信息表  
- 引擎：InnoDB ｜ 估算行数：29845 ｜ 主键：`catid, reorder`
 ｜ 索引：`MUL(cat)`

### `elabcn_product_skus`

- 说明：产品规格，价格信息表  
- 引擎：InnoDB ｜ 估算行数：50190 ｜ 主键：`goodsid`
 ｜ 索引：`MUL(cat)`

### `elabcn_product_solution`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：71071 ｜ 主键：`catid, solutionid`

### `elabcn_promotion_products`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：1951 ｜ 主键：`id, catid, act_code`

### `elabcn_publication_amounts`

- 说明：文献数据  
- 引擎：MyISAM ｜ 估算行数：21 ｜ 主键：`id`

### `elabcn_publication_lists`

- 说明：—  
- 引擎：MyISAM ｜ 估算行数：71074 ｜ 主键：`id`
 ｜ 索引：`MUL(product_line,doi,year,country,research_area,unique_id)`

### `elabcn_publication_lists_base_view`

- 说明：VIEW  
- 引擎： ｜ 估算行数：- ｜ 主键：`—`

### `elabcn_publication_new`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：26013 ｜ 主键：`id`
 ｜ 索引：`UNI(title,doi); MUL(product_line,impact,year,country,province,research_area)`

### `elabcn_publication_old_20260701000100`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：24237 ｜ 主键：`id`
 ｜ 索引：`UNI(title,doi); MUL(product_line,impact,year,country,province,research_area)`

### `elabcn_publication_old_20260801000100`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：24979 ｜ 主键：`id`
 ｜ 索引：`UNI(title,doi); MUL(product_line,impact,year,country,province,research_area)`

### `elabcn_publication_recommend_cat`

- 说明：文献publication与推荐货号recommend_cat的关系表  
- 引擎：InnoDB ｜ 估算行数：0 ｜ 主键：`id`
 ｜ 索引：`MUL(publication_id)`

### `elabcn_search_count`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：0 ｜ 主键：`id`

### `elabcn_solution_web`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：350 ｜ 主键：`id, solutionid`

### `elabcn_tool_lists`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：0 ｜ 主键：`id`

### `elabcn_uniscience_goodstype_web`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：41 ｜ 主键：`goodstypeid`

### `elabcn_uniscience_product`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：426 ｜ 主键：`catid`

### `elabcn_wbm_cats_detail_url`

- 说明：VIEW  
- 引擎： ｜ 估算行数：- ｜ 主键：`—`

### `elabcn_website_menu`

- 说明：网站菜单导航  
- 引擎：InnoDB ｜ 估算行数：129 ｜ 主键：`id`

### `elabcn_website_menu_copy2`

- 说明：网站菜单导航  
- 引擎：InnoDB ｜ 估算行数：98 ｜ 主键：`id`
 ｜ 索引：`UNI(name)`

### `elabcn_wrong_search_keywords`

- 说明：搜索错词库  
- 引擎：InnoDB ｜ 估算行数：5053 ｜ 主键：`id`
 ｜ 索引：`MUL(wrong_words)`


## elabcom_ — 伊莱瑞特英文站（61 表）

### `elabcom_act_code_promotion`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：1 ｜ 主键：`id`

### `elabcom_article`

- 说明：文章  
- 引擎：InnoDB ｜ 估算行数：19 ｜ 主键：`id`

### `elabcom_banner`

- 说明：轮播banner  
- 引擎：InnoDB ｜ 估算行数：5 ｜ 主键：`id`

### `elabcom_blog_blog`

- 说明：博客分类  
- 引擎：InnoDB ｜ 估算行数：86 ｜ 主键：`id`

### `elabcom_blog_post`

- 说明：博客文章  
- 引擎：InnoDB ｜ 估算行数：636 ｜ 主键：`id`

### `elabcom_cell_marker`

- 说明：产品分类表  
- 引擎：InnoDB ｜ 估算行数：1366 ｜ 主键：`id, marker_id, abbre, reactivity_id`

### `elabcom_cell_marker_web`

- 说明：产品分类表  
- 引擎：InnoDB ｜ 估算行数：138 ｜ 主键：`marker_id`

### `elabcom_compare`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：298 ｜ 主键：`id`

### `elabcom_conjugate_color`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：24 ｜ 主键：`id`

### `elabcom_country`

- 说明：国家列表  
- 引擎：InnoDB ｜ 估算行数：241 ｜ 主键：`id`
 ｜ 索引：`UNI(name)`

### `elabcom_distributors`

- 说明：代理商  
- 引擎：InnoDB ｜ 估算行数：51 ｜ 主键：`id`

### `elabcom_document`

- 说明：文档  
- 引擎：InnoDB ｜ 估算行数：0 ｜ 主键：`id`

### `elabcom_elisa_cancer_publication_cat`

- 说明：VIEW  
- 引擎： ｜ 估算行数：- ｜ 主键：`—`

### `elabcom_elisa_linearity`

- 说明：线性数据  
- 引擎：InnoDB ｜ 估算行数：27712 ｜ 主键：`id`

### `elabcom_elisa_precision`

- 说明：精密度数据  
- 引擎：InnoDB ｜ 估算行数：1953 ｜ 主键：`id, catid`

### `elabcom_elisa_sample_verification`

- 说明：样本验证数据  
- 引擎：InnoDB ｜ 估算行数：0 ｜ 主键：`id`

### `elabcom_elisa_stdcurve`

- 说明：标曲数据  
- 引擎：InnoDB ｜ 估算行数：21005 ｜ 主键：`id`

### `elabcom_event`

- 说明：活动  
- 引擎：InnoDB ｜ 估算行数：9 ｜ 主键：`id`
 ｜ 索引：`MUL(name)`

### `elabcom_export_flow_view_250427`

- 说明：VIEW  
- 引擎： ｜ 估算行数：- ｜ 主键：`—`

### `elabcom_faqs`

- 说明：FAQs  
- 引擎：InnoDB ｜ 估算行数：615 ｜ 主键：`id`

### `elabcom_flow_cytometry_platform`

- 说明：VIEW  
- 引擎： ｜ 估算行数：- ｜ 主键：`—`

### `elabcom_goodstype_erp`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：259 ｜ 主键：`goodstypeid`

### `elabcom_goodstype_web`

- 说明：产品分类表  
- 引擎：InnoDB ｜ 估算行数：105 ｜ 主键：`id, goodstypeid`

### `elabcom_goodstype_web_journal`

- 说明：产品分类表  
- 引擎：InnoDB ｜ 估算行数：0 ｜ 主键：`id`
 ｜ 索引：`UNI(goodstypeid)`

### `elabcom_home`

- 说明：首页图片配置  
- 引擎：InnoDB ｜ 估算行数：12 ｜ 主键：`id`

### `elabcom_hot_journals`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：32 ｜ 主键：`id`

### `elabcom_odoo_order`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：6 ｜ 主键：`—`

### `elabcom_odoo_user`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：30 ｜ 主键：`—`

### `elabcom_pdf_apply_info`

- 说明：实验指南申请记录表  
- 引擎：InnoDB ｜ 估算行数：805 ｜ 主键：`id`
 ｜ 索引：`MUL(user_email)`

### `elabcom_pdf_data202507`

- 说明：VIEW  
- 引擎： ｜ 估算行数：- ｜ 主键：`—`

### `elabcom_pdf_data2025，02-03月`

- 说明：VIEW  
- 引擎： ｜ 估算行数：- ｜ 主键：`—`

### `elabcom_pdf_download_history`

- 说明：实验指南下载历史数据  
- 引擎：InnoDB ｜ 估算行数：1195 ｜ 主键：`id`

### `elabcom_product_antibody_and_reagents`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：20155 ｜ 主键：`catid`
 ｜ 索引：`UNI(cat)`

### `elabcom_product_cell_health_detection`

- 说明：细胞功能与代谢测定  
- 引擎：InnoDB ｜ 估算行数：118 ｜ 主键：`catid`
 ｜ 索引：`UNI(cat)`

### `elabcom_product_cell_isolation_and_identification`

- 说明：细胞功能与代谢测定  
- 引擎：InnoDB ｜ 估算行数：29 ｜ 主键：`catid`
 ｜ 索引：`UNI(cat)`

### `elabcom_product_filter`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：115 ｜ 主键：`id`
 ｜ 索引：`MUL(sort_ii)`

### `elabcom_product_filter_journal`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：0 ｜ 主键：`id`
 ｜ 索引：`MUL(sort_ii)`

### `elabcom_product_images`

- 说明：产品图片信息表  
- 引擎：InnoDB ｜ 估算行数：40797 ｜ 主键：`catid, reorder`
 ｜ 索引：`MUL(cat)`

### `elabcom_product_immunoassays`

- 说明：免疫测定试剂盒与试剂  
- 引擎：InnoDB ｜ 估算行数：3336 ｜ 主键：`catid`
 ｜ 索引：`UNI(cat)`

### `elabcom_product_main`

- 说明：产品信息主表  
- 引擎：InnoDB ｜ 估算行数：35216 ｜ 主键：`catid`
 ｜ 索引：`UNI(cat); MUL(abbre,status,sort_i,sort_ii,sort_iii,conjugate,species,detection_instrument,clone_no)`

### `elabcom_product_metabolism`

- 说明：细胞功能与代谢测定  
- 引擎：InnoDB ｜ 估算行数：579 ｜ 主键：`catid`
 ｜ 索引：`UNI(cat)`

### `elabcom_product_pricella`

- 说明：细胞功能与代谢测定  
- 引擎：InnoDB ｜ 估算行数：2688 ｜ 主键：`catid`
 ｜ 索引：`UNI(cat)`

### `elabcom_product_pricella_composition`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：2233 ｜ 主键：`catid, reorder`

### `elabcom_product_proteins_and_peptides`

- 说明：蛋白类子表  
- 引擎：InnoDB ｜ 估算行数：6577 ｜ 主键：`catid`
 ｜ 索引：`UNI(cat)`

### `elabcom_product_resources`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：164 ｜ 主键：`id`

### `elabcom_product_result_photo`

- 说明：产品图片信息表  
- 引擎：InnoDB ｜ 估算行数：51063 ｜ 主键：`catid, reorder`
 ｜ 索引：`MUL(cat)`

### `elabcom_product_skus`

- 说明：产品规格，价格信息表  
- 引擎：InnoDB ｜ 估算行数：99466 ｜ 主键：`goodsid`
 ｜ 索引：`MUL(cat)`

### `elabcom_product_solution`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：104591 ｜ 主键：`catid, solutionid`

### `elabcom_publication_amounts`

- 说明：文献数据  
- 引擎：MyISAM ｜ 估算行数：20 ｜ 主键：`id`

### `elabcom_publication_lists`

- 说明：—  
- 引擎：MyISAM ｜ 估算行数：125985 ｜ 主键：`id`
 ｜ 索引：`MUL(product_line,doi,year,country,research_area,status,unique_id)`

### `elabcom_publication_lists_base_view`

- 说明：VIEW  
- 引擎： ｜ 估算行数：- ｜ 主键：`—`

### `elabcom_publication_new`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：44401 ｜ 主键：`id`
 ｜ 索引：`UNI(title,doi); MUL(product_line,impact,year,country,province,research_area)`

### `elabcom_publication_old_20260701000100`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：60720 ｜ 主键：`id`
 ｜ 索引：`UNI(title,doi); MUL(product_line,impact,year,country,province,research_area)`

### `elabcom_publication_old_20260801000100`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：40339 ｜ 主键：`id`
 ｜ 索引：`UNI(title,doi); MUL(product_line,impact,year,country,province,research_area)`

### `elabcom_solution_web`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：350 ｜ 主键：`id, solutionid`

### `elabcom_state`

- 说明：—  
- 引擎：InnoDB ｜ 估算行数：146 ｜ 主键：`id`

### `elabcom_trial_products`

- 说明：USA试用装的所有产品信息  
- 引擎：MyISAM ｜ 估算行数：58 ｜ 主键：`id`
 ｜ 索引：`UNI(cat)`

### `elabcom_webinars_replay`

- 说明：网研回放申请  
- 引擎：InnoDB ｜ 估算行数：449 ｜ 主键：`id`

### `elabcom_webinars_request`

- 说明：网研申请  
- 引擎：InnoDB ｜ 估算行数：79 ｜ 主键：`id`

### `elabcom_website_menu`

- 说明：网站菜单导航  
- 引擎：InnoDB ｜ 估算行数：126 ｜ 主键：`id`

### `elabcom_wrong_search_keywords`

- 说明：搜索错词库  
- 引擎：InnoDB ｜ 估算行数：5137 ｜ 主键：`id`
 ｜ 索引：`MUL(wrong_words)`
