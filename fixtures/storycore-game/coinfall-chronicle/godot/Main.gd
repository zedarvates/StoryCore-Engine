extends Node2D

const MANIFEST_PATH := "res://storycore_game_manifest.json"
const CONTRACT_VERSION := "0.1"
const BOARD_LEFT := 110.0
const BOARD_RIGHT := 850.0
const DROP_Y := 150.0
const BIN_Y := 625.0

var manifest: Dictionary = {}
var locale := "en"
var score := 0
var collected := 0
var drop_count := 0
var run_ended := false
var rng := RandomNumberGenerator.new()

var title_label: Label
var instruction_label: Label
var quest_label: Label
var message_label: Label


func _ready() -> void:
	if not _load_and_verify_manifest():
		return
	rng.seed = int(manifest["gameplay"]["board_seed"])
	_create_background()
	_create_board()
	_create_interface()
	_update_interface()


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_L:
			locale = "fr" if locale == "en" else "en"
			_update_interface()
			return
		if event.keycode == KEY_R:
			get_tree().reload_current_scene()
			return
		if event.keycode == KEY_SPACE:
			_drop_rune(rng.randf_range(BOARD_LEFT + 35.0, BOARD_RIGHT - 35.0))
			return
	if event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_LEFT:
			_drop_rune(clampf(event.position.x, BOARD_LEFT + 25.0, BOARD_RIGHT - 25.0))
	if event is InputEventScreenTouch and event.pressed:
		_drop_rune(clampf(event.position.x, BOARD_LEFT + 25.0, BOARD_RIGHT - 25.0))


func _physics_process(_delta: float) -> void:
	for rune in get_tree().get_nodes_in_group("active_runes"):
		if rune.position.y > 780.0:
			rune.queue_free()


func _load_and_verify_manifest() -> bool:
	if not FileAccess.file_exists(MANIFEST_PATH):
		_show_fatal("Manifest missing: " + MANIFEST_PATH)
		return false
	var file := FileAccess.open(MANIFEST_PATH, FileAccess.READ)
	if file == null:
		_show_fatal("Manifest cannot be opened.")
		return false
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if typeof(parsed) != TYPE_DICTIONARY:
		_show_fatal("Manifest is not a JSON object.")
		return false
	manifest = parsed
	var required := [
		"contract_version", "compiled_by", "content_sha256", "project",
		"locales", "world", "actors", "items", "quest", "gameplay",
		"runtime", "boundary"
	]
	for key in required:
		if not manifest.has(key):
			_show_fatal("Manifest field missing: " + str(key))
			return false
	if str(manifest["contract_version"]) != CONTRACT_VERSION:
		_show_fatal("Unsupported contract version.")
		return false
	var boundary: Dictionary = manifest["boundary"]
	if boundary.get("public_contract_only") != true:
		_show_fatal("Public contract marker missing.")
		return false
	if boundary.get("private_components_included") != false:
		_show_fatal("Private components are forbidden in this fixture.")
		return false
	if str(manifest["runtime"].get("authority", "")) != "local-fixture":
		_show_fatal("This fixture accepts local-fixture authority only.")
		return false
	var core := manifest.duplicate(true)
	var expected_hash := str(core.get("content_sha256", ""))
	core.erase("content_sha256")
	if _sha256(_canonical_json(core)) != expected_hash:
		_show_fatal("Manifest content hash mismatch.")
		return false
	return true


func _canonical_json(value: Variant) -> String:
	match typeof(value):
		TYPE_DICTIONARY:
			var keys: Array = value.keys()
			keys.sort()
			var pairs := PackedStringArray()
			for key in keys:
				pairs.append(JSON.stringify(str(key)) + ":" + _canonical_json(value[key]))
			return "{" + ",".join(pairs) + "}"
		TYPE_ARRAY:
			var entries := PackedStringArray()
			for entry in value:
				entries.append(_canonical_json(entry))
			return "[" + ",".join(entries) + "]"
		TYPE_FLOAT:
			# Godot may parse integral JSON numbers as floats. The compiler's
			# canonical JSON writes them without a decimal suffix.
			if value == floor(value):
				return str(int(value))
			return JSON.stringify(value)
		_:
			return JSON.stringify(value)


func _sha256(text: String) -> String:
	var context := HashingContext.new()
	context.start(HashingContext.HASH_SHA256)
	context.update(text.to_utf8_buffer())
	return context.finish().hex_encode()


func _show_fatal(message: String) -> void:
	var backdrop := ColorRect.new()
	backdrop.color = Color("15101f")
	backdrop.size = Vector2(960.0, 720.0)
	add_child(backdrop)
	var label := Label.new()
	label.text = "Coinfall Chronicle stopped safely\n\n" + message
	label.position = Vector2(120.0, 280.0)
	label.size = Vector2(720.0, 160.0)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.add_theme_font_size_override("font_size", 24)
	label.add_theme_color_override("font_color", Color("ffb4ab"))
	add_child(label)
	set_process_unhandled_input(false)
	set_physics_process(false)


func _create_background() -> void:
	var backdrop := Polygon2D.new()
	backdrop.polygon = PackedVector2Array([
		Vector2.ZERO, Vector2(960.0, 0.0), Vector2(960.0, 720.0), Vector2(0.0, 720.0)
	])
	backdrop.color = Color("171124")
	backdrop.z_index = -10
	add_child(backdrop)
	var board_glow := Polygon2D.new()
	board_glow.polygon = _rectangle_points(Vector2(760.0, 520.0))
	board_glow.position = Vector2(480.0, 405.0)
	board_glow.color = Color("241936")
	board_glow.z_index = -9
	add_child(board_glow)


func _create_board() -> void:
	_make_wall(Vector2(BOARD_LEFT, 405.0), Vector2(14.0, 510.0), Color("8d6bb8"))
	_make_wall(Vector2(BOARD_RIGHT, 405.0), Vector2(14.0, 510.0), Color("8d6bb8"))
	for row in range(7):
		var columns := 9 if row % 2 == 0 else 8
		var offset := 0.0 if row % 2 == 0 else 40.0
		for column in range(columns):
			var peg_x := 160.0 + offset + float(column) * 80.0
			var peg_y := 235.0 + float(row) * 48.0
			_make_peg(Vector2(peg_x, peg_y))
	_create_bins()


func _create_bins() -> void:
	var scores: Array = manifest["gameplay"]["score_bins"]
	var width := (BOARD_RIGHT - BOARD_LEFT) / float(scores.size())
	for index in range(scores.size()):
		var center_x := BOARD_LEFT + width * (float(index) + 0.5)
		var area := Area2D.new()
		area.position = Vector2(center_x, BIN_Y)
		area.collision_layer = 0
		area.collision_mask = 1
		var collision := CollisionShape2D.new()
		var shape := RectangleShape2D.new()
		shape.size = Vector2(width - 8.0, 58.0)
		collision.shape = shape
		area.add_child(collision)
		area.body_entered.connect(_on_bin_entered.bind(index))
		add_child(area)
		var tile := Polygon2D.new()
		tile.polygon = _rectangle_points(Vector2(width - 8.0, 58.0))
		tile.color = Color("4b3567") if index != 2 else Color("7552a3")
		area.add_child(tile)
		var label := Label.new()
		label.text = "+" + str(scores[index])
		label.position = Vector2(-width * 0.5, -13.0)
		label.size = Vector2(width, 30.0)
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.add_theme_font_size_override("font_size", 18)
		label.add_theme_color_override("font_color", Color("f7d67a"))
		area.add_child(label)
	if scores.size() > 1:
		for divider in range(1, scores.size()):
			var divider_x := BOARD_LEFT + width * float(divider)
			_make_wall(Vector2(divider_x, 585.0), Vector2(8.0, 95.0), Color("8d6bb8"))


func _make_peg(position_value: Vector2) -> void:
	var body := StaticBody2D.new()
	body.position = position_value
	var collision := CollisionShape2D.new()
	var circle := CircleShape2D.new()
	circle.radius = 9.0
	collision.shape = circle
	body.add_child(collision)
	var visual := Polygon2D.new()
	visual.polygon = _circle_points(9.0, 16)
	visual.color = Color("c8a9eb")
	body.add_child(visual)
	add_child(body)


func _make_wall(position_value: Vector2, size: Vector2, color: Color) -> void:
	var body := StaticBody2D.new()
	body.position = position_value
	var collision := CollisionShape2D.new()
	var rectangle := RectangleShape2D.new()
	rectangle.size = size
	collision.shape = rectangle
	body.add_child(collision)
	var visual := Polygon2D.new()
	visual.polygon = _rectangle_points(size)
	visual.color = color
	body.add_child(visual)
	add_child(body)


func _drop_rune(x_position: float) -> void:
	if run_ended or drop_count >= int(manifest["gameplay"]["drop_limit"]):
		return
	drop_count += 1
	var body := RigidBody2D.new()
	body.position = Vector2(x_position, DROP_Y)
	body.collision_layer = 1
	body.collision_mask = 1
	body.gravity_scale = 0.92
	body.mass = 0.8
	body.continuous_cd = RigidBody2D.CCD_MODE_CAST_RAY
	body.angular_velocity = rng.randf_range(-2.0, 2.0)
	body.set_meta("resolved", false)
	body.add_to_group("active_runes")
	var collision := CollisionShape2D.new()
	var circle := CircleShape2D.new()
	circle.radius = 14.0
	collision.shape = circle
	body.add_child(collision)
	var visual := Polygon2D.new()
	visual.polygon = _circle_points(14.0, 20)
	visual.color = Color("79d5ff")
	body.add_child(visual)
	var core := Polygon2D.new()
	core.polygon = _circle_points(6.0, 12)
	core.color = Color("f6e8ff")
	body.add_child(core)
	add_child(body)
	_update_interface()


func _on_bin_entered(body: Node2D, bin_index: int) -> void:
	if not body.is_in_group("active_runes") or bool(body.get_meta("resolved", false)):
		return
	body.set_meta("resolved", true)
	var scores: Array = manifest["gameplay"]["score_bins"]
	score += int(scores[bin_index])
	collected += 1
	body.queue_free()
	_update_interface()
	_evaluate_run()


func _evaluate_run() -> void:
	var objective: Dictionary = manifest["quest"]["objectives"][0]
	var objective_done := collected >= int(objective["required_count"])
	var score_done := score >= int(manifest["gameplay"]["score_target"])
	if objective_done and score_done:
		run_ended = true
		var reward: Dictionary = manifest["quest"]["rewards"][0]
		var reward_name := _item_name(str(reward["item_id"]))
		message_label.text = (
			("Quest complete — Reward: " if locale == "en" else "Quête accomplie — Récompense : ")
			+ str(reward["count"]) + " × " + reward_name + "   [R]"
		)
		message_label.add_theme_color_override("font_color", Color("8ff0a4"))
	elif drop_count >= int(manifest["gameplay"]["drop_limit"]):
		run_ended = true
		message_label.text = (
			"Run ended — press R to retry."
			if locale == "en"
			else "Partie terminée — appuie sur R pour recommencer."
		)
		message_label.add_theme_color_override("font_color", Color("ffb4ab"))


func _create_interface() -> void:
	title_label = Label.new()
	title_label.position = Vector2(30.0, 16.0)
	title_label.size = Vector2(900.0, 38.0)
	title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title_label.add_theme_font_size_override("font_size", 28)
	title_label.add_theme_color_override("font_color", Color("f6e8ff"))
	add_child(title_label)
	instruction_label = Label.new()
	instruction_label.position = Vector2(30.0, 55.0)
	instruction_label.size = Vector2(900.0, 30.0)
	instruction_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	instruction_label.add_theme_color_override("font_color", Color("c8a9eb"))
	add_child(instruction_label)
	quest_label = Label.new()
	quest_label.position = Vector2(35.0, 92.0)
	quest_label.size = Vector2(890.0, 48.0)
	quest_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	quest_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	quest_label.add_theme_font_size_override("font_size", 17)
	quest_label.add_theme_color_override("font_color", Color("f7d67a"))
	add_child(quest_label)
	message_label = Label.new()
	message_label.position = Vector2(30.0, 684.0)
	message_label.size = Vector2(900.0, 28.0)
	message_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	message_label.add_theme_color_override("font_color", Color("d7c8e8"))
	add_child(message_label)


func _update_interface() -> void:
	if title_label == null:
		return
	title_label.text = _localized(manifest["project"]["title"])
	instruction_label.text = (
		"Click or Space: drop rune   •   L: français   •   R: restart"
		if locale == "en"
		else "Clic ou Espace : lâcher une rune   •   L : English   •   R : recommencer"
	)
	var objective: Dictionary = manifest["quest"]["objectives"][0]
	var quest_title := _localized(manifest["quest"]["title"])
	if locale == "en":
		quest_label.text = "%s  •  Runes %d/%d  •  Score %d/%d  •  Drops %d/%d" % [
			quest_title, collected, int(objective["required_count"]), score,
			int(manifest["gameplay"]["score_target"]), drop_count,
			int(manifest["gameplay"]["drop_limit"])
		]
	else:
		quest_label.text = "%s  •  Runes %d/%d  •  Score %d/%d  •  Lancers %d/%d" % [
			quest_title, collected, int(objective["required_count"]), score,
			int(manifest["gameplay"]["score_target"]), drop_count,
			int(manifest["gameplay"]["drop_limit"])
		]
	if not run_ended:
		message_label.text = _localized(manifest["actors"][0]["dialogue"])[0]


func _localized(values: Dictionary) -> Variant:
	return values.get(locale, values.get("en", ""))


func _item_name(item_id: String) -> String:
	for item in manifest["items"]:
		if str(item["id"]) == item_id:
			return str(_localized(item["name"]))
	return item_id


func _rectangle_points(size: Vector2) -> PackedVector2Array:
	var half := size * 0.5
	return PackedVector2Array([
		Vector2(-half.x, -half.y), Vector2(half.x, -half.y),
		Vector2(half.x, half.y), Vector2(-half.x, half.y)
	])


func _circle_points(radius: float, sides: int) -> PackedVector2Array:
	var points := PackedVector2Array()
	for index in range(sides):
		var angle := TAU * float(index) / float(sides)
		points.append(Vector2(cos(angle), sin(angle)) * radius)
	return points
