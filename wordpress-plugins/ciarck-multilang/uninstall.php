<?php
/**
 * CIArck Multilang — Uninstall
 *
 * Runs when the plugin is deleted via the WordPress admin.
 * Drops the custom translations table from the database.
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
    exit;
}

global $wpdb;
$table = $wpdb->prefix . 'ciarck_translations';

// phpcs:ignore WordPress.DB.DirectDatabaseQuery
$wpdb->query( "DROP TABLE IF EXISTS {$table}" );

delete_option( 'ciarck_ml_db_version' );
