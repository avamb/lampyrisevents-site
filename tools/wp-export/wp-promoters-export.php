<?php
// Promoter directory: option lampyris_promoters, plus which events point at each promoter.
$p = lx_promoters();
$use = $wpdb->get_results("SELECT meta_value pid, post_id FROM {$wpdb->postmeta} WHERE meta_key='lampyris_promoter_id' AND meta_value<>''", ARRAY_A);
$byp = [];
foreach ($use as $u) $byp[(int) $u['pid']][] = (int) $u['post_id'];
$orgs = $wpdb->get_col("SELECT DISTINCT meta_value FROM {$wpdb->postmeta} WHERE meta_key='bil24_organizer_name' AND meta_value<>''");
$out = [];
foreach ($p as $id => $row) $out[] = $row + ['event_post_ids' => $byp[$id] ?? []];
lx_out(['generated' => gmdate('c'), 'source' => 'wp-promoters-export.php', 'counts' => ['promoters' => count($out)], 'promoters' => $out, 'bil24_organizer_names' => $orgs]);
