<?php
// Sources for redirects: WooCommerce products (old /product/ pages), the tag archives with their language,
// and every post id with its public path (for ?p=<id> links).
$prod = [];
foreach ($wpdb->get_results("SELECT ID, post_name, post_title FROM {$wpdb->posts} WHERE post_type IN ('product','product_variation') AND post_status='publish'", ARRAY_A) as $r) {
    $m = array_map(fn($v) => is_array($v) ? ($v[0] ?? '') : $v, get_post_meta((int) $r['ID']));
    $keep = array_filter($m, fn($v, $k) => in_array($k, ['bil24_action_id', 'bil24_action_event_id', 'bil24_product_id', '_sku'], true), ARRAY_FILTER_USE_BOTH);
    $prod[] = ['id' => (int) $r['ID'], 'slug' => $r['post_name'], 'title' => lx_text($r['post_title']), 'url' => get_permalink((int) $r['ID']), 'meta' => $keep];
}
$tags = [];
foreach ($wpdb->get_results("SELECT t.term_id, t.slug, tt.taxonomy FROM {$wpdb->terms} t JOIN {$wpdb->term_taxonomy} tt ON tt.term_id=t.term_id WHERE tt.taxonomy IN ('post_tag','product_tag')", ARRAY_A) as $t) {
    $tags[] = $t + ['url' => get_term_link((int) $t['term_id'], $t['taxonomy'])];
}
$ids = [];
foreach ($wpdb->get_results("SELECT ID, post_type, post_name FROM {$wpdb->posts} WHERE post_type IN ('page','past-event','product') AND post_status='publish'", ARRAY_A) as $r) {
    $ids[] = ['id' => (int) $r['ID'], 'type' => $r['post_type'], 'url' => lx_permalink((int) $r['ID'])];
}
lx_out(['generated' => gmdate('c'), 'source' => 'wp-redirect-sources-export.php', 'products' => $prod, 'tags' => $tags, 'post_urls' => $ids]);
