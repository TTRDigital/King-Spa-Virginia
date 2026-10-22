<?php
/**
 * KING SPA Virginia: form handler for the static site (SiteGround runs PHP).
 *
 * Receives the site's forms (lib/runtime/forms.ts):
 *   newsletter  footer "Join our newsletter" + /subscribe/ (Elementor forms)
 *   review      private feedback form on /reviews/ (Contact Form 7)
 *   comment     "Leave a Reply" on /about/sophia-kim/
 * and emails each submission. Newsletter sign-ups are also added to a
 * Klaviyo list when one is set.
 *
 * Settings live in api/.config.php (never in the repository): the deploy
 * workflow writes it from GitHub secrets. Without it nothing is sent and the
 * form shows an error, so a misconfiguration is visible.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

function reply($ok, $code = 200) {
  http_response_code($code);
  echo json_encode(['ok' => $ok]);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') reply(false, 405);

// Same-site posts only.
$host = 'virginia.kingspa.com';
$origin = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
$originHost = parse_url($origin, PHP_URL_HOST);
if ($originHost && $originHost !== $host && $originHost !== ($_SERVER['HTTP_HOST'] ?? '') && !preg_match('/^(localhost|127\.0\.0\.1)$/', $originHost)) reply(false, 403);

$config = @include __DIR__ . '/.config.php';
if (!is_array($config) || empty($config['to'])) reply(false, 503);

// Spam trap: hidden field real visitors leave empty.
if (!empty($_POST['ks_website'])) reply(true);

$kind = $_POST['ks_form'] ?? '';
if (!in_array($kind, ['newsletter', 'review', 'comment'], true)) reply(false, 400);

$clean = function ($v, $max = 2000) {
  $v = is_string($v) ? trim($v) : '';
  $v = str_replace(["\r\n", "\r"], "\n", $v);
  return mb_substr(strip_tags($v), 0, $max);
};

// Google reCAPTCHA v2 (the forms that have the checkbox on the live site).
function recaptcha_ok($secret, $token) {
  if (!$secret) return true; // not configured: rely on the spam trap
  if (!$token) return false;
  $ctx = stream_context_create(['http' => [
    'method' => 'POST',
    'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
    'content' => http_build_query(['secret' => $secret, 'response' => $token, 'remoteip' => $_SERVER['REMOTE_ADDR'] ?? '']),
    'timeout' => 8,
  ]]);
  $res = @file_get_contents('https://www.google.com/recaptcha/api/siteverify', false, $ctx);
  $json = $res ? json_decode($res, true) : null;
  return !empty($json['success']);
}

$token = $_POST['g-recaptcha-response'] ?? '';
$page = $clean($_POST['ks_page'] ?? '', 200);
$fields = [];

if ($kind === 'newsletter') {
  if (!recaptcha_ok($config['recaptcha_secret_elementor'] ?? '', $token)) reply(false, 400);
  $f = $_POST['form_fields'] ?? [];
  $email = filter_var($clean($f['email'] ?? '', 200), FILTER_VALIDATE_EMAIL);
  if (!$email) reply(false, 400);
  $fields = ['Form' => $clean($_POST['ks_form_name'] ?? '', 100), 'First name' => $clean($f['first_name'] ?? '', 100), 'Last name' => $clean($f['last_name'] ?? '', 100), 'Email' => $email];
  $subject = 'New newsletter sign-up (virginia.kingspa.com)';
} elseif ($kind === 'review') {
  if (!recaptcha_ok($config['recaptcha_secret_cf7'] ?? '', $token)) reply(false, 400);
  $email = filter_var($clean($_POST['email-address'] ?? '', 200), FILTER_VALIDATE_EMAIL);
  if (!$email || $clean($_POST['fullname'] ?? '') === '' || $clean($_POST['message'] ?? '') === '') reply(false, 400);
  $fields = ['Full name' => $clean($_POST['fullname'] ?? '', 200), 'Date of visit' => $clean($_POST['date'] ?? '', 40), 'Email' => $email, 'Phone' => $clean($_POST['phone'] ?? '', 40), 'Message' => $clean($_POST['message'] ?? '', 5000)];
  $subject = 'New feedback from the Reviews page (virginia.kingspa.com)';
} else {
  $email = filter_var($clean($_POST['email'] ?? '', 200), FILTER_VALIDATE_EMAIL);
  if (!$email || $clean($_POST['comment'] ?? '') === '' || $clean($_POST['author'] ?? '') === '') reply(false, 400);
  $fields = ['Name' => $clean($_POST['author'] ?? '', 200), 'Email' => $email, 'Website' => $clean($_POST['url'] ?? '', 300), 'Comment' => $clean($_POST['comment'] ?? '', 5000)];
  $subject = 'New comment (virginia.kingspa.com)';
}

$body = '';
foreach ($fields as $k => $v) $body .= "$k: $v\n";
$body .= "\nPage: https://$host$page\nSent: " . gmdate('Y-m-d H:i') . " UTC\n";

$from = $config['from'] ?? "noreply@$host";
$headers = "From: KING SPA Virginia website <$from>\r\nReply-To: " . ($fields['Email'] ?? $from) . "\r\nContent-Type: text/plain; charset=UTF-8";
$sent = @mail($config['to'], '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers, "-f$from");

// Newsletter: also add the person to the Klaviyo list (Klaviyo's public client API).
if ($kind === 'newsletter' && !empty($config['klaviyo_list_id'])) {
  $payload = json_encode(['data' => ['type' => 'subscription', 'attributes' => [
    'profile' => ['data' => ['type' => 'profile', 'attributes' => array_filter(['email' => $fields['Email'], 'first_name' => $fields['First name'], 'last_name' => $fields['Last name']])]],
  ], 'relationships' => ['list' => ['data' => ['type' => 'list', 'id' => $config['klaviyo_list_id']]]]]]);
  $ctx = stream_context_create(['http' => ['method' => 'POST', 'header' => "Content-Type: application/vnd.api+json\r\nrevision: 2024-10-15\r\n", 'content' => $payload, 'timeout' => 8, 'ignore_errors' => true]]);
  $res = @file_get_contents('https://a.klaviyo.com/client/subscriptions/?company_id=' . urlencode($config['klaviyo_company_id'] ?? 'VuDLmc'), false, $ctx);
  if ($res !== false) $sent = true;
}

reply((bool) $sent, $sent ? 200 : 500);
