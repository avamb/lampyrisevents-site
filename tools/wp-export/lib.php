<?php
// Shared read-only helpers. The runner (run.mjs) puts this file in front of each export script
// and feeds the result to `php` over ssh stdin. Nothing here writes to WordPress.
define('DOING_CRON', true);
$_SERVER['HTTP_HOST'] = 'lampyrisevents.com';
require '/var/www/html/wp-load.php';
global $wpdb;
ini_set('memory_limit', '1024M');
set_time_limit(0);

const LX_CPT = 'past-event';

function lx_out($data) {
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT | JSON_PARTIAL_OUTPUT_ON_ERROR);
}

function lx_text($s) {
    return html_entity_decode((string) $s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

/** Attachment by id -> plain array, URL built from the uploads dir (no CDN / WPML filters). */
function lx_att($aid) {
    static $cache = [];
    $aid = (int) $aid;
    if ($aid <= 0) return null;
    if (array_key_exists($aid, $cache)) return $cache[$aid];
    $file = get_post_meta($aid, '_wp_attached_file', true);
    if (!$file) return $cache[$aid] = null;
    $up = wp_get_upload_dir();
    $meta = get_post_meta($aid, '_wp_attachment_metadata', true);
    return $cache[$aid] = [
        'id'   => $aid,
        'url'  => rtrim($up['baseurl'], '/') . '/' . $file,
        'file' => $file,
        'mime' => get_post_mime_type($aid),
        'width'  => is_array($meta) ? ($meta['width'] ?? null) : null,
        'height' => is_array($meta) ? ($meta['height'] ?? null) : null,
        'alt'  => get_post_meta($aid, '_wp_attachment_image_alt', true),
        'title' => lx_text(get_the_title($aid)),
    ];
}

/** A meta value that may hold an attachment id, a url, or a list of either -> list of {url,...}. */
function lx_media_list($v) {
    $out = [];
    if (is_string($v) && $v !== '' && ($v[0] === '[' || $v[0] === '{') && ($j = json_decode($v, true)) && is_array($j)) $v = $j;
    if (!is_array($v)) $v = ($v === '' || $v === null) ? [] : [$v];
    foreach ($v as $x) {
        if (is_array($x)) { $out = array_merge($out, lx_media_list($x)); continue; }
        $x = trim((string) $x);
        if ($x === '') continue;
        if (ctype_digit($x)) { $a = lx_att($x); if ($a) $out[] = $a; continue; }
        $out[] = ['id' => null, 'url' => $x];
    }
    return $out;
}

/** Every WPML row of an element type -> [ID => [trid, lang, source]]. */
function lx_wpml_rows($type) {
    global $wpdb;
    static $cache = [];
    if (isset($cache[$type])) return $cache[$type];
    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT element_id, trid, language_code, source_language_code FROM {$wpdb->prefix}icl_translations WHERE element_type=%s", $type), ARRAY_A);
    $m = [];
    foreach ($rows as $r) $m[(int) $r['element_id']] = ['trid' => (int) $r['trid'], 'lang' => $r['language_code'], 'source' => $r['source_language_code']];
    return $cache[$type] = $m;
}

/** Meta without the plumbing (ACF key refs, Elementor, SEO, locks). Unserialized. */
function lx_meta_public($id) {
    $out = [];
    foreach (get_post_meta($id) as $k => $vals) {
        if ($k[0] === '_') continue;
        if (preg_match('/^(slim_seo|tp_widgets|rank_math|yoast)/', $k)) continue;
        $out[$k] = maybe_unserialize($vals[0] ?? '');
    }
    ksort($out);
    return $out;
}

/** Permalink in the post's own language (CLI runs in the default language, so switch first). */
function lx_permalink($id) {
    global $sitepress;
    $type = 'post_' . get_post_type($id);
    $row = lx_wpml_rows($type)[(int) $id] ?? null;
    if ($row && $sitepress) { $sitepress->switch_lang($row['lang']); }
    $url = get_permalink($id);
    if ($sitepress) { $sitepress->switch_lang('en'); }
    return $url;
}

function lx_tags($id) {
    $t = wp_get_object_terms($id, 'post_tag', ['fields' => 'all']);
    if (is_wp_error($t)) return [];
    return array_map(fn($x) => ['id' => $x->term_id, 'slug' => $x->slug, 'name' => $x->name], $t);
}

function lx_promoters() {
    $out = [];
    foreach ((array) get_option('lampyris_promoters', []) as $p) if (is_array($p) && !empty($p['id'])) $out[(int) $p['id']] = $p;
    return $out;
}

/** One past-event post -> the full record (every field the site and the platform need). */
function lx_event($id) {
    $p = get_post($id);
    $m = lx_meta_public($id);
    $g = function ($k) use ($m) { $v = $m[$k] ?? ''; return is_scalar($v) ? (string) $v : $v; };
    $promoters = lx_promoters();
    $pid = (int) $g('lampyris_promoter_id');
    $alts = [];
    foreach ([1, 2, 3] as $i) { $u = $g('buy_button_link_alternative_' . $i); if ($u !== '') $alts[] = $u; }
    $media = [
        'poster'  => lx_media_list($g('passed_event_image_small')),
        'gallery' => array_merge(lx_media_list($g('passed_event_image_galery_image_1')), lx_media_list($g('passed_event_image_galery_image_2'))),
        'featured' => lx_att(get_post_thumbnail_id($id)),
        'organizer_logo' => lx_media_list($g('btm_organizer_logo')),
        'video_link' => $g('video_link'),
    ];
    // Per-language media and report blocks written by lampyris-ops (lops_media_*, lops_report_*).
    $lops = [];
    foreach ($m as $k => $v) {
        if (strpos($k, 'lops_') !== 0) continue;
        $lops[$k] = (strpos($k, 'gallery') !== false) ? lx_media_list($v) : $v;
    }
    return [
        'id' => (int) $id,
        'slug' => $p->post_name,
        'slug_decoded' => rawurldecode($p->post_name),
        'url' => lx_permalink($id),
        'status' => $p->post_status,
        'title' => lx_text($p->post_title),
        'name' => lx_text($g('passed_event_name')),
        'published' => $p->post_date_gmt,
        'modified' => $p->post_modified_gmt,
        'tags' => lx_tags($id),
        'tag_state' => (string) get_post_meta($id, '_lampyris_event_tag_state', true),
        'date_local' => $g('passed_event_date'),
        'city' => $g('past_event_city_name'),
        'country' => $g('passed_event_country_name'),
        'venue' => $g('passed_event_venue_name'),
        'venue_address' => $g('venue_address'),
        'price_from' => $g('ticket_price'),
        'currency' => $g('price_currensy'),
        'description_html' => $g('passed_event_text'),
        'partner_url' => $g('buy_button_link'),
        'partner_urls_extra' => $alts,
        'bil24' => [
            'action_id' => $g('bil24_action_id'),
            'action_event_id' => $g('bil24_action_event_id'),
            'product_id' => $g('bil24_product_id'),
            'organizer_name' => $g('bil24_organizer_name'),
            'sell_end_time' => $g('bil24_sell_end_time'),
            'availability' => $g('bil24_availability'),
            'price_matrix_json' => $g('bil24_price_matrix_json'),
        ],
        'promoter_id' => $pid ?: null,
        'promoter' => $promoters[$pid] ?? null,
        'is_tour' => $g('lampyris_is_tour') === '1',
        'tour_id' => (int) $g('lampyris_tour_id') ?: null,
        'media' => $media,
        'lops' => $lops,
        'meta_raw' => $m, // the raw public meta stays in the record, nothing is dropped silently
    ];
}

/** Groups of translations for the given ids: [{trid, language, original, translations:{lang:record}}]. */
function lx_groups(array $ids) {
    $rows = lx_wpml_rows('post_' . LX_CPT);
    $byTrid = [];
    foreach ($ids as $id) {
        $r = $rows[$id] ?? ['trid' => -$id, 'lang' => 'en', 'source' => null];
        $byTrid[$r['trid']][$id] = $r;
    }
    $groups = [];
    foreach ($byTrid as $trid => $members) {
        $origId = null;
        foreach ($members as $id => $r) if (empty($r['source'])) { $origId = $id; break; }
        if ($origId === null) $origId = array_key_first($members);
        $g = ['trid' => $trid, 'language' => $members[$origId]['lang'], 'original' => lx_event($origId), 'translations' => []];
        foreach ($members as $id => $r) {
            if ($id === $origId) continue;
            $g['translations'][$r['lang']] = lx_event($id);
        }
        ksort($g['translations']);
        $groups[] = $g;
    }
    return $groups;
}

/** IDs of every past-event post that is not trashed. */
function lx_all_event_ids() {
    global $wpdb;
    return array_map('intval', $wpdb->get_col("SELECT ID FROM {$wpdb->posts} WHERE post_type='" . LX_CPT . "' AND post_status IN ('publish','draft','private','pending')"));
}

/** Is this record an upcoming event (tag actual)? */
function lx_is_actual($rec) {
    foreach ($rec['tags'] as $t) if ($t['slug'] === 'actual') return true;
    return $rec['tag_state'] === 'actual';
}
