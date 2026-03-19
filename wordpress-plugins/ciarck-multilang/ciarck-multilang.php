<?php
/**
 * Plugin Name: CIArck Multilang
 * Plugin URI:  https://github.com/Malguzt/CIArck-Gen
 * Description: Lightweight multilingual post management. Exposes "lang" and "translations" fields via the WP REST API, enabling external apps to create and link translated posts without heavy third-party plugins.
 * Version:     1.0.0
 * Author:      CIArck
 * License:     GPL-2.0-or-later
 * Text Domain: ciarck-multilang
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/* ─────────────────────────────────────────────
 * Constants
 * ───────────────────────────────────────────── */
define( 'CIARCK_ML_VERSION', '1.0.0' );
define( 'CIARCK_ML_TABLE',   'ciarck_translations' );

/* ─────────────────────────────────────────────
 * Activation — create the database table
 * ───────────────────────────────────────────── */
register_activation_hook( __FILE__, 'ciarck_ml_activate' );

function ciarck_ml_activate() {
    global $wpdb;
    $table   = $wpdb->prefix . CIARCK_ML_TABLE;
    $charset = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE IF NOT EXISTS {$table} (
        id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        post_id         BIGINT UNSIGNED NOT NULL,
        lang            VARCHAR(10)     NOT NULL DEFAULT '',
        translation_group BIGINT UNSIGNED NOT NULL DEFAULT 0,
        PRIMARY KEY (id),
        UNIQUE KEY post_id (post_id),
        KEY lang (lang),
        KEY translation_group (translation_group)
    ) {$charset};";

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta( $sql );

    update_option( 'ciarck_ml_db_version', CIARCK_ML_VERSION );
}

/* ─────────────────────────────────────────────
 * Helper — get the table name
 * ───────────────────────────────────────────── */
function ciarck_ml_table() {
    global $wpdb;
    return $wpdb->prefix . CIARCK_ML_TABLE;
}

/* ─────────────────────────────────────────────
 * Helper — get next translation group ID
 * ───────────────────────────────────────────── */
function ciarck_ml_next_group() {
    global $wpdb;
    $table = ciarck_ml_table();
    $max   = (int) $wpdb->get_var( "SELECT COALESCE(MAX(translation_group), 0) FROM {$table}" );
    return $max + 1;
}

/* ─────────────────────────────────────────────
 * Helper — get lang for a post
 * ───────────────────────────────────────────── */
function ciarck_ml_get_lang( $post_id ) {
    global $wpdb;
    $table = ciarck_ml_table();
    return $wpdb->get_var( $wpdb->prepare(
        "SELECT lang FROM {$table} WHERE post_id = %d", $post_id
    ) );
}

/* ─────────────────────────────────────────────
 * Helper — get translation group for a post
 * ───────────────────────────────────────────── */
function ciarck_ml_get_group( $post_id ) {
    global $wpdb;
    $table = ciarck_ml_table();
    return (int) $wpdb->get_var( $wpdb->prepare(
        "SELECT translation_group FROM {$table} WHERE post_id = %d", $post_id
    ) );
}

/* ─────────────────────────────────────────────
 * Helper — get translations map for a post
 * Returns { lang_code => post_id, ... }
 * ───────────────────────────────────────────── */
function ciarck_ml_get_translations( $post_id ) {
    global $wpdb;
    $table = ciarck_ml_table();

    $group = ciarck_ml_get_group( $post_id );
    if ( ! $group ) {
        // Post not in any group — return itself only if it has a lang
        $lang = ciarck_ml_get_lang( $post_id );
        return $lang ? array( $lang => $post_id ) : null;
    }

    $rows = $wpdb->get_results( $wpdb->prepare(
        "SELECT post_id, lang FROM {$table} WHERE translation_group = %d", $group
    ) );

    $map = array();
    foreach ( $rows as $row ) {
        $map[ $row->lang ] = (int) $row->post_id;
    }
    return $map;
}

/* ─────────────────────────────────────────────
 * Helper — set lang (and optionally group) for a post
 * ───────────────────────────────────────────── */
function ciarck_ml_set_lang( $post_id, $lang, $group = 0 ) {
    global $wpdb;
    $table = ciarck_ml_table();

    $existing = $wpdb->get_row( $wpdb->prepare(
        "SELECT id FROM {$table} WHERE post_id = %d", $post_id
    ) );

    if ( $existing ) {
        $data = array( 'lang' => $lang );
        if ( $group > 0 ) {
            $data['translation_group'] = $group;
        }
        $wpdb->update( $table, $data, array( 'post_id' => $post_id ) );
    } else {
        $wpdb->insert( $table, array(
            'post_id'           => $post_id,
            'lang'              => $lang,
            'translation_group' => $group,
        ) );
    }
}

/* ─────────────────────────────────────────────
 * Helper — link a post into a translation group
 * Expects $translations = { "es" => 5, "en" => 8, ... }
 * ───────────────────────────────────────────── */
function ciarck_ml_link_translations( $post_id, $lang, $translations ) {
    global $wpdb;
    $table = ciarck_ml_table();

    // Find the group from any of the sibling posts
    $group = 0;
    foreach ( $translations as $t_lang => $t_post_id ) {
        $t_post_id = (int) $t_post_id;
        if ( $t_post_id > 0 && $t_post_id !== $post_id ) {
            $existing_group = ciarck_ml_get_group( $t_post_id );
            if ( $existing_group > 0 ) {
                $group = $existing_group;
                break;
            }
        }
    }

    // If no existing group found, create a new one
    if ( ! $group ) {
        $group = ciarck_ml_next_group();
    }

    // Set the current post's lang and group
    ciarck_ml_set_lang( $post_id, $lang, $group );

    // Ensure all sibling posts are also in this group
    foreach ( $translations as $t_lang => $t_post_id ) {
        $t_post_id = (int) $t_post_id;
        if ( $t_post_id > 0 && $t_post_id !== $post_id ) {
            ciarck_ml_set_lang( $t_post_id, $t_lang, $group );
        }
    }
}

/* ─────────────────────────────────────────────
 * REST API — Register "lang" and "translations" on posts
 * ───────────────────────────────────────────── */
add_action( 'rest_api_init', 'ciarck_ml_register_rest_fields' );

function ciarck_ml_register_rest_fields() {

    /* --- lang field --- */
    register_rest_field( 'post', 'lang', array(
        'get_callback' => function ( $post_arr ) {
            return ciarck_ml_get_lang( $post_arr['id'] ) ?: null;
        },
        'update_callback' => function ( $value, $post ) {
            if ( ! empty( $value ) ) {
                // Only set lang; group linking is handled by the "translations" field
                $existing_group = ciarck_ml_get_group( $post->ID );
                ciarck_ml_set_lang( $post->ID, sanitize_text_field( $value ), $existing_group );
            }
        },
        'schema' => array(
            'type'        => array( 'string', 'null' ),
            'description' => 'Language code for this post (e.g. es, en, fr, zh).',
            'context'     => array( 'view', 'edit' ),
        ),
    ) );

    /* --- translations field --- */
    register_rest_field( 'post', 'translations', array(
        'get_callback' => function ( $post_arr ) {
            return ciarck_ml_get_translations( $post_arr['id'] );
        },
        'update_callback' => function ( $value, $post ) {
            if ( is_array( $value ) && ! empty( $value ) ) {
                // We need to know the lang of this post to insert it into the group
                $lang = ciarck_ml_get_lang( $post->ID );

                // If no lang is set yet on this post, try to find it from the request body
                if ( ! $lang ) {
                    // Check if lang was provided alongside translations in the same request
                    $request_body = json_decode( file_get_contents( 'php://input' ), true );
                    if ( ! empty( $request_body['lang'] ) ) {
                        $lang = sanitize_text_field( $request_body['lang'] );
                    }
                }

                if ( $lang ) {
                    ciarck_ml_link_translations( $post->ID, $lang, $value );
                }
            }
        },
        'schema' => array(
            'type'        => array( 'object', 'null' ),
            'description' => 'Map of language codes to post IDs for all translations in this group.',
            'context'     => array( 'view', 'edit' ),
        ),
    ) );
}

/* ─────────────────────────────────────────────
 * REST API — Filter posts by ?lang=xx
 * ───────────────────────────────────────────── */
add_action( 'rest_api_init', 'ciarck_ml_register_lang_param' );

function ciarck_ml_register_lang_param() {
    // Add the "lang" query parameter to the posts endpoint
    add_filter( 'rest_post_collection_params', function ( $params ) {
        $params['lang'] = array(
            'description' => 'Filter posts by language code.',
            'type'        => 'string',
            'required'    => false,
        );
        return $params;
    } );

    // Filter the SQL query to join our translations table
    add_filter( 'rest_post_query', function ( $args, $request ) {
        $lang = $request->get_param( 'lang' );
        if ( ! empty( $lang ) ) {
            $args['ciarck_ml_lang'] = sanitize_text_field( $lang );
        }
        return $args;
    }, 10, 2 );
}

// Hook into WP_Query to apply the lang filter
add_filter( 'posts_clauses', 'ciarck_ml_filter_by_lang', 10, 2 );

function ciarck_ml_filter_by_lang( $clauses, $query ) {
    if ( empty( $query->query_vars['ciarck_ml_lang'] ) ) {
        return $clauses;
    }

    global $wpdb;
    $table = ciarck_ml_table();
    $lang  = esc_sql( $query->query_vars['ciarck_ml_lang'] );

    $clauses['join']  .= " INNER JOIN {$table} AS cml ON ({$wpdb->posts}.ID = cml.post_id)";
    $clauses['where'] .= $wpdb->prepare( " AND cml.lang = %s", $lang );

    return $clauses;
}

/* ─────────────────────────────────────────────
 * Cleanup — remove translation data when a post is deleted
 * ───────────────────────────────────────────── */
add_action( 'before_delete_post', 'ciarck_ml_on_delete_post' );

function ciarck_ml_on_delete_post( $post_id ) {
    global $wpdb;
    $table = ciarck_ml_table();
    $wpdb->delete( $table, array( 'post_id' => $post_id ) );
}

/* ─────────────────────────────────────────────
 * Admin — Minimal Settings Page (Language column in posts list)
 * ───────────────────────────────────────────── */

// Add "Language" column to the posts list table
add_filter( 'manage_posts_columns', 'ciarck_ml_add_lang_column' );

function ciarck_ml_add_lang_column( $columns ) {
    $columns['ciarck_lang'] = __( 'Language', 'ciarck-multilang' );
    return $columns;
}

add_action( 'manage_posts_custom_column', 'ciarck_ml_render_lang_column', 10, 2 );

function ciarck_ml_render_lang_column( $column, $post_id ) {
    if ( 'ciarck_lang' === $column ) {
        $lang = ciarck_ml_get_lang( $post_id );
        if ( $lang ) {
            echo '<strong>' . esc_html( strtoupper( $lang ) ) . '</strong>';
            $translations = ciarck_ml_get_translations( $post_id );
            if ( $translations && count( $translations ) > 1 ) {
                $codes = array_keys( $translations );
                echo ' <small style="color:#888;">(+' . ( count( $codes ) - 1 ) . ' trans.)</small>';
            }
        } else {
            echo '<span style="color:#999;">—</span>';
        }
    }
}

/* ═══════════════════════════════════════════════
 * FRONTEND — Language Selector for Blog Visitors
 * ═══════════════════════════════════════════════ */

/* ─────────────────────────────────────────────
 * Supported languages config (labels + flag emoji)
 * ───────────────────────────────────────────── */
function ciarck_ml_get_languages() {
    return array(
        'es' => array( 'label' => 'Español',  'flag' => '🇪🇸' ),
        'en' => array( 'label' => 'English',  'flag' => '🇺🇸' ),
        'zh' => array( 'label' => '中文',      'flag' => '🇨🇳' ),
        'fr' => array( 'label' => 'Français', 'flag' => '🇫🇷' ),
    );
}

/* ─────────────────────────────────────────────
 * Frontend query — filter main query by ?lang=xx
 * ───────────────────────────────────────────── */
add_action( 'pre_get_posts', 'ciarck_ml_frontend_lang_filter' );

function ciarck_ml_frontend_lang_filter( $query ) {
    if ( is_admin() || ! $query->is_main_query() ) {
        return;
    }

    $lang = isset( $_GET['lang'] ) ? sanitize_text_field( $_GET['lang'] ) : '';
    
    // If no lang in URL, use the detected/default one (e.g. 'es')
    if ( empty( $lang ) ) {
        $lang = ciarck_ml_get_current_lang();
    }

    if ( ! empty( $lang ) ) {
        $query->set( 'ciarck_ml_lang', $lang );
    }
}

/* ─────────────────────────────────────────────
 * Detect current language from context
 * ───────────────────────────────────────────── */
function ciarck_ml_get_current_lang() {
    // 1. Explicit ?lang= in URL
    if ( ! empty( $_GET['lang'] ) ) {
        return sanitize_text_field( $_GET['lang'] );
    }
    // 2. Single post — read from DB
    if ( is_singular( 'post' ) ) {
        $lang = ciarck_ml_get_lang( get_the_ID() );
        if ( $lang ) return $lang;
    }
    // 3. Default
    return 'es';
}

/* ─────────────────────────────────────────────
 * Build switcher URLs for each language
 * ───────────────────────────────────────────── */
function ciarck_ml_get_switcher_links() {
    $languages  = ciarck_ml_get_languages();
    $current    = ciarck_ml_get_current_lang();
    $links      = array();

    // On a single post: link to translations if they exist
    if ( is_singular( 'post' ) ) {
        $post_id      = get_the_ID();
        $translations = ciarck_ml_get_translations( $post_id );

        foreach ( $languages as $code => $info ) {
            $entry = array(
                'code'    => $code,
                'label'   => $info['label'],
                'flag'    => $info['flag'],
                'active'  => ( $code === $current ),
                'url'     => null,
            );

            if ( $translations && isset( $translations[ $code ] ) ) {
                $entry['url'] = get_permalink( $translations[ $code ] );
            }
            // If no translation exists, the link stays null (disabled)

            $links[] = $entry;
        }
    } else {
        // Archive / home / search: add or replace ?lang= parameter
        foreach ( $languages as $code => $info ) {
            $links[] = array(
                'code'    => $code,
                'label'   => $info['label'],
                'flag'    => $info['flag'],
                'active'  => ( $code === $current ),
                'url'     => add_query_arg( 'lang', $code ),
            );
        }
    }

    return $links;
}

/* ─────────────────────────────────────────────
 * Inject switcher into primary navigation menu
 * ───────────────────────────────────────────── */
add_filter( 'wp_nav_menu_items', 'ciarck_ml_menu_switcher', 20, 2 );

function ciarck_ml_menu_switcher( $items, $args ) {
    // Only add to the primary / header menu location
    $target_locations = array( 'primary', 'header', 'main-menu', 'menu-1', 'primary-menu' );
    $location = isset( $args->theme_location ) ? $args->theme_location : '';

    if ( ! in_array( $location, $target_locations, true ) && $location !== '' ) {
        return $items;
    }

    $links   = ciarck_ml_get_switcher_links();
    $current = ciarck_ml_get_current_lang();
    $langs   = ciarck_ml_get_languages();

    $current_flag  = isset( $langs[ $current ] ) ? $langs[ $current ]['flag'] : '🌐';
    $current_label = isset( $langs[ $current ] ) ? strtoupper( $current ) : '??';

    // Build dropdown HTML
    $html  = '<li class="menu-item ciarck-lang-switcher">';
    $html .= '<a href="#" class="ciarck-lang-toggle" aria-expanded="false" aria-haspopup="true">';
    $html .= '<span class="ciarck-lang-current">' . $current_flag . ' ' . esc_html( $current_label ) . '</span>';
    $html .= '<svg class="ciarck-lang-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>';
    $html .= '</a>';
    $html .= '<ul class="ciarck-lang-dropdown">';

    foreach ( $links as $link ) {
        $class  = 'ciarck-lang-item';
        $class .= $link['active'] ? ' ciarck-lang-active' : '';
        $class .= empty( $link['url'] ) ? ' ciarck-lang-disabled' : '';

        $tag = ! empty( $link['url'] )
            ? '<a href="' . esc_url( $link['url'] ) . '">'
            : '<span>';
        $close = ! empty( $link['url'] ) ? '</a>' : '</span>';

        $html .= '<li class="' . esc_attr( $class ) . '">';
        $html .= $tag;
        $html .= '<span class="ciarck-lang-flag">' . $link['flag'] . '</span>';
        $html .= '<span class="ciarck-lang-label">' . esc_html( $link['label'] ) . '</span>';
        if ( $link['active'] ) {
            $html .= '<span class="ciarck-lang-check">✓</span>';
        }
        $html .= $close;
        $html .= '</li>';
    }

    $html .= '</ul></li>';

    return $items . $html;
}

/* ─────────────────────────────────────────────
 * Enqueue inline CSS + JS for the switcher
 * ───────────────────────────────────────────── */
add_action( 'wp_head', 'ciarck_ml_switcher_styles' );

function ciarck_ml_switcher_styles() {
    if ( is_admin() ) return;
    ?>
    <style id="ciarck-multilang-switcher">
    /* ── Language Switcher Container ── */
    .ciarck-lang-switcher {
        position: relative;
        list-style: none;
    }
    .ciarck-lang-toggle {
        display: inline-flex !important;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none !important;
        transition: background 0.2s, color 0.2s;
        color: inherit;
    }
    .ciarck-lang-toggle:hover {
        background: rgba(0,0,0,0.06);
    }
    .ciarck-lang-chevron {
        transition: transform 0.25s ease;
    }
    .ciarck-lang-switcher.open .ciarck-lang-chevron {
        transform: rotate(180deg);
    }

    /* ── Dropdown ── */
    .ciarck-lang-dropdown {
        display: none;
        position: absolute;
        right: 0;
        top: calc(100% + 6px);
        min-width: 180px;
        background: #fff;
        border: 1px solid rgba(0,0,0,0.08);
        border-radius: 12px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
        padding: 6px;
        z-index: 99999;
        list-style: none;
        margin: 0;
    }
    .ciarck-lang-switcher.open .ciarck-lang-dropdown {
        display: block;
        animation: ciarckFadeIn 0.2s ease;
    }
    @keyframes ciarckFadeIn {
        from { opacity: 0; transform: translateY(-6px); }
        to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Items ── */
    .ciarck-lang-item a,
    .ciarck-lang-item span {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        border-radius: 8px;
        text-decoration: none !important;
        color: #333;
        font-size: 14px;
        font-weight: 500;
        transition: background 0.15s;
    }
    .ciarck-lang-item a:hover {
        background: #f3f4f6;
    }
    .ciarck-lang-active a,
    .ciarck-lang-active span {
        background: #eef2ff;
        color: #4338ca;
        font-weight: 600;
    }
    .ciarck-lang-disabled span {
        opacity: 0.35;
        cursor: default;
    }
    .ciarck-lang-flag {
        font-size: 18px;
        line-height: 1;
    }
    .ciarck-lang-label {
        flex: 1;
    }
    .ciarck-lang-check {
        font-size: 13px;
        color: #4338ca;
        font-weight: 700;
    }

    /* ── Dark theme support ── */
    @media (prefers-color-scheme: dark) {
        .ciarck-lang-dropdown {
            background: #1f2937;
            border-color: rgba(255,255,255,0.08);
            box-shadow: 0 12px 40px rgba(0,0,0,0.4);
        }
        .ciarck-lang-toggle:hover {
            background: rgba(255,255,255,0.08);
        }
        .ciarck-lang-item a,
        .ciarck-lang-item span {
            color: #e5e7eb;
        }
        .ciarck-lang-item a:hover {
            background: rgba(255,255,255,0.06);
        }
        .ciarck-lang-active a,
        .ciarck-lang-active span {
            background: rgba(99,102,241,0.15);
            color: #a5b4fc;
        }
        .ciarck-lang-check {
            color: #a5b4fc;
        }
    }
    </style>
    <?php
}

add_action( 'wp_footer', 'ciarck_ml_switcher_script' );

function ciarck_ml_switcher_script() {
    if ( is_admin() ) return;
    ?>
    <script id="ciarck-multilang-switcher-js">
    (function(){
        var toggle = document.querySelector('.ciarck-lang-toggle');
        var switcher = document.querySelector('.ciarck-lang-switcher');
        if (!toggle || !switcher) return;

        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var isOpen = switcher.classList.toggle('open');
            toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        document.addEventListener('click', function(e) {
            if (!switcher.contains(e.target)) {
                switcher.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                switcher.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    })();
    </script>
    <?php
}
