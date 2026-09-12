extends SceneTree

const MAIN_SCENE := "res://Main.tscn"
const CENTER_BIN := 2
const DROP_X := 480.0
const REQUIRED_DROPS := 5


func _init() -> void:
	call_deferred("_run")


func _run() -> void:
	var packed_scene := ResourceLoader.load(MAIN_SCENE) as PackedScene
	if packed_scene == null:
		_fail("main scene could not be loaded")
		return
	var game: Node = packed_scene.instantiate()
	root.add_child(game)
	await process_frame

	var game_manifest: Dictionary = game.get("manifest")
	if game_manifest.is_empty():
		_fail("verified manifest was not loaded")
		return
	for _drop_index in range(REQUIRED_DROPS):
		game.call("_drop_rune", DROP_X)
		await process_frame
		var rune := _pending_rune()
		if rune == null:
			_fail("drop did not create an unresolved rune")
			return
		game.call("_on_bin_entered", rune, CENTER_BIN)
		await process_frame

	var gameplay: Dictionary = game_manifest["gameplay"]
	var scores: Array = gameplay["score_bins"]
	var expected_score := REQUIRED_DROPS * int(scores[CENTER_BIN])
	if int(game.get("score")) != expected_score:
		_fail("center-bin score does not match the manifest")
		return
	if int(game.get("collected")) != REQUIRED_DROPS:
		_fail("quest collection progress is incorrect")
		return
	if int(game.get("drop_count")) != REQUIRED_DROPS:
		_fail("drop counter is incorrect")
		return
	if not bool(game.get("run_ended")):
		_fail("quest did not reach its completion state")
		return

	game.set("locale", "fr")
	game.call("_update_interface")
	var title_label := game.get("title_label") as Label
	if title_label == null or title_label.text != "La Chronique des runes":
		_fail("French localization did not load")
		return

	print(
		"STORYCORE_GAME_SMOKE_PASS score=%d collected=%d locale=fr" % [
			int(game.get("score")), int(game.get("collected"))
		]
	)
	game.queue_free()
	await process_frame
	quit(0)


func _pending_rune() -> Node2D:
	for candidate in get_nodes_in_group("active_runes"):
		if candidate is Node2D and not bool(candidate.get_meta("resolved", false)):
			return candidate
	return null


func _fail(message: String) -> void:
	push_error("STORYCORE_GAME_SMOKE_FAIL: " + message)
	quit(1)
