<?php
// Inventory of every published page: language, translation group, slug, permalink, parent, template.
// The rendered HTML is fetched over public HTTP by tools/fetch-pages.mjs, not from here.
$rows = lx_wpml_rows('post_page');
$ids = $wpdb->get_col("SELECT ID FROM {$wpdb->posts} WHERE post_type='page' AND post_status='publish'");
$front = (int) get_option('page_on_front');
$out = [];
foreach ($ids as $id) {
    $id = (int) $id;
    $p = get_post($id);
    $r = $rows[$id] ?? ['trid' => null, 'lang' => null, 'source' => null];
    $out[] = [
        'id' => $id, 'lang' => $r['lang'], 'trid' => $r['trid'], 'is_original' => empty($r['source']),
        'slug' => $p->post_name, 'slug_decoded' => rawurldecode($p->post_name),
        'url' => lx_permalink($id), 'parent' => (int) $p->post_parent,
        'title' => lx_text($p->post_title), 'modified' => $p->post_modified_gmt,
        'template' => get_post_meta($id, '_wp_page_template', true),
        'elementor' => (bool) get_post_meta($id, '_elementor_data', true),
        'is_front' => in_array($id, [$front], true),
    ];
}
usort($out, fn($a, $b) => [$a['trid'], $a['lang']] <=> [$b['trid'], $b['lang']]);
// Translated front pages and WPML language settings (hidden languages, default language, URL format).
$sitepress = get_option('icl_sitepress_settings', []);
$langs = $wpdb->get_results("SELECT code, active FROM {$wpdb->prefix}icl_languages WHERE active=1", ARRAY_A);
lx_out(['generated' => gmdate('c'), 'source' => 'wp-pages-export.php',
    'counts' => ['pages' => count($out)],
    'front_page_id' => $front, 'posts_page_id' => (int) get_option('page_for_posts'),
    'wpml' => ['default_language' => $sitepress['default_language'] ?? null, 'hidden_languages' => $sitepress['hidden_languages'] ?? null,
               'language_negotiation_type' => $sitepress['language_negotiation_type'] ?? null, 'active' => $langs],
    'pages' => $out]);
