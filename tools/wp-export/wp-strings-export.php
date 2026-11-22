<?php
// WPML string translations (theme, plugin, mailer, Cookie Notice, menus) for the interface dictionaries.
// Elementor page-body strings (context elementor-*) are exported too: they are the page texts per language.
// Admin-only contexts (admin_texts_*, acf-*, WP Endpoints) are skipped.
$t = $wpdb->prefix;
$strings = $wpdb->get_results("SELECT id, context, name, value, language, gettext_context FROM {$t}icl_strings WHERE context NOT LIKE 'admin_texts%' AND context NOT LIKE 'acf-%' AND context <> 'WP Endpoints'", ARRAY_A);
$tr = $wpdb->get_results("SELECT string_id, language, status, value FROM {$t}icl_string_translations WHERE status IN (10,2) AND value <> ''", ARRAY_A);
$by = [];
foreach ($tr as $x) $by[(int) $x['string_id']][$x['language']] = $x['value'];
$out = [];
foreach ($strings as $s) {
    $out[] = ['id' => (int) $s['id'], 'context' => $s['context'], 'name' => $s['name'], 'source_lang' => $s['language'],
              'gettext_context' => $s['gettext_context'], 'source' => $s['value'], 'translations' => $by[(int) $s['id']] ?? new stdClass()];
}
// Options are NOT exported: they hold API keys (btm_settings, lops_arena) and buyer data (lops_offsite_tickets).
lx_out(['generated' => gmdate('c'), 'source' => 'wp-strings-export.php',
    'counts' => ['strings' => count($out), 'with_translations' => count(array_filter($out, fn($s) => (array) $s['translations']))],
    'strings' => $out]);
