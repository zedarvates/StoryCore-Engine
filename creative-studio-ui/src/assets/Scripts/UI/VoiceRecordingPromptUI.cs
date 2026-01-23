using System;
using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

/// <summary>
/// Interface utilisateur pour le prompteur d'enregistrement vocal
/// Affiche la phrase actuelle et gère les contrôles d'enregistrement
/// </summary>
public class VoiceRecordingPromptUI : MonoBehaviour
{
    [Header("UI Components")]
    [SerializeField] private Canvas promptCanvas;
    [SerializeField] private TextMeshProUGUI phraseText;
    [SerializeField] private TextMeshProUGUI statusText;
    [SerializeField] private TextMeshProUGUI progressText;
    [SerializeField] private Slider progressBar;
    [SerializeField] private Button startStopButton;
    [SerializeField] private Button nextPhraseButton;
    [SerializeField] private Button cancelButton;
    [SerializeField] private Button finishButton;
    [SerializeField] private Image recordingIndicator;
    [SerializeField] private Slider audioLevelBar;

    [Header("Visual Settings")]
    [SerializeField] private Color recordingColor = Color.red;
    [SerializeField] private Color idleColor = Color.gray;
    [SerializeField] private Color completedColor = Color.green;
    [SerializeField] private float indicatorBlinkRate = 1f;

    [Header("References")]
    [SerializeField] private SequenceTimelineSynchronizer synchronizer;

    private bool isRecording;
    private string currentPhraseText;
    private Coroutine indicatorCoroutine;

    public event Action OnStartRecording;
    public event Action OnStopRecording;
    public event Action OnNextPhrase;
    public event Action OnCancelRecording;
    public event Action OnFinishSession;

    private void Awake()
    {
        InitializeUI();
        SetupButtonListeners();
        HidePrompt();
    }

    private void InitializeUI()
    {
        if (promptCanvas == null) promptCanvas = GetComponent<Canvas>();
        if (phraseText == null) phraseText = transform.Find("PhraseText").GetComponent<TextMeshProUGUI>();
        if (statusText == null) statusText = transform.Find("StatusText").GetComponent<TextMeshProUGUI>();
        if (progressText == null) progressText = transform.Find("ProgressText").GetComponent<TextMeshProUGUI>();
        if (progressBar == null) progressBar = transform.Find("ProgressBar").GetComponent<Slider>();
        if (startStopButton == null) startStopButton = transform.Find("StartStopButton").GetComponent<Button>();
        if (nextPhraseButton == null) nextPhraseButton = transform.Find("NextPhraseButton").GetComponent<Button>();
        if (cancelButton == null) cancelButton = transform.Find("CancelButton").GetComponent<Button>();
        if (finishButton == null) finishButton = transform.Find("FinishButton").GetComponent<Button>();
        if (recordingIndicator == null) recordingIndicator = transform.Find("RecordingIndicator").GetComponent<Image>();
        if (audioLevelBar == null) audioLevelBar = transform.Find("AudioLevelBar").GetComponent<Slider>();
    }

    private void SetupButtonListeners()
    {
        startStopButton.onClick.AddListener(OnStartStopButtonClick);
        nextPhraseButton.onClick.AddListener(() => OnNextPhrase?.Invoke());
        cancelButton.onClick.AddListener(() => OnCancelRecording?.Invoke());
        finishButton.onClick.AddListener(() => OnFinishSession?.Invoke());
    }

    private void OnStartStopButtonClick()
    {
        if (isRecording)
        {
            OnStopRecording?.Invoke();
        }
        else
        {
            OnStartRecording?.Invoke();
        }
    }

    /// <summary>
    /// Affiche le prompteur avec la phrase spécifiée
    /// </summary>
    public void ShowPrompt(string phrase, int currentIndex, int totalPhrases)
    {
        currentPhraseText = phrase;
        phraseText.text = phrase;
        progressText.text = $"Phrase {currentIndex + 1}/{totalPhrases}";
        progressBar.value = (float)currentIndex / totalPhrases;

        UpdateRecordingState(false);
        promptCanvas.enabled = true;
    }

    /// <summary>
    /// Masque le prompteur
    /// </summary>
    public void HidePrompt()
    {
        promptCanvas.enabled = false;
        StopIndicatorAnimation();
    }

    /// <summary>
    /// Met à jour l'état d'enregistrement
    /// </summary>
    public void UpdateRecordingState(bool recording)
    {
        isRecording = recording;

        if (recording)
        {
            statusText.text = "ENREGISTREMENT";
            statusText.color = recordingColor;
            startStopButton.GetComponentInChildren<TextMeshProUGUI>().text = "STOP";
            recordingIndicator.color = recordingColor;
            StartIndicatorAnimation();
        }
        else
        {
            statusText.text = "Prêt à enregistrer";
            statusText.color = idleColor;
            startStopButton.GetComponentInChildren<TextMeshProUGUI>().text = "START";
            recordingIndicator.color = idleColor;
            StopIndicatorAnimation();
        }

        // Mettre à jour la visibilité des boutons
        nextPhraseButton.interactable = !recording;
        cancelButton.interactable = !recording;
        finishButton.interactable = !recording;
    }

    /// <summary>
    /// Met à jour le niveau audio affiché
    /// </summary>
    public void UpdateAudioLevel(float level)
    {
        audioLevelBar.value = Mathf.Clamp01(level * 10f); // Amplifier pour visibilité
    }

    /// <summary>
    /// Met à jour le progrès global
    /// </summary>
    public void UpdateProgress(float progress)
    {
        progressBar.value = progress;
        progressText.text = $"Progression: {Mathf.RoundToInt(progress * 100)}%";
    }

    /// <summary>
    /// Affiche un message d'erreur
    /// </summary>
    public void ShowError(string errorMessage)
    {
        statusText.text = $"ERREUR: {errorMessage}";
        statusText.color = Color.red;
        StartCoroutine(HideErrorAfterDelay(3f));
    }

    /// <summary>
    /// Affiche un message de succès
    /// </summary>
    public void ShowSuccess(string message)
    {
        statusText.text = message;
        statusText.color = completedColor;
    }

    private void StartIndicatorAnimation()
    {
        if (indicatorCoroutine != null) StopCoroutine(indicatorCoroutine);
        indicatorCoroutine = StartCoroutine(BlinkIndicator());
    }

    private void StopIndicatorAnimation()
    {
        if (indicatorCoroutine != null)
        {
            StopCoroutine(indicatorCoroutine);
            indicatorCoroutine = null;
        }
        recordingIndicator.color = idleColor;
    }

    private IEnumerator BlinkIndicator()
    {
        while (true)
        {
            recordingIndicator.color = recordingColor;
            yield return new WaitForSeconds(indicatorBlinkRate / 2f);
            recordingIndicator.color = Color.Lerp(recordingColor, idleColor, 0.5f);
            yield return new WaitForSeconds(indicatorBlinkRate / 2f);
        }
    }

    private IEnumerator HideErrorAfterDelay(float delay)
    {
        yield return new WaitForSeconds(delay);
        if (!isRecording)
        {
            statusText.text = "Prêt à enregistrer";
            statusText.color = idleColor;
        }
    }

    /// <summary>
    /// Configure la référence au synchronisateur (optionnel si défini dans l'inspector)
    /// </summary>
    public void SetSynchronizer(SequenceTimelineSynchronizer sync)
    {
        synchronizer = sync;

        // S'abonner aux événements du synchronisateur
        if (synchronizer != null)
        {
            synchronizer.OnRecordingProgress += UpdateProgress;
            synchronizer.OnSyncError += ShowError;
        }
    }

    private void OnDestroy()
    {
        // Nettoyer les abonnements
        if (synchronizer != null)
        {
            synchronizer.OnRecordingProgress -= UpdateProgress;
            synchronizer.OnSyncError -= ShowError;
        }

        StopIndicatorAnimation();
    }
}