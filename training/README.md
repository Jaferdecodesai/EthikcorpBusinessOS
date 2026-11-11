# Instruction set for a later LoRA

`ethikcorp-businessos-instruct.jsonl` is a grounded question-and-answer set built from the public sample tables. Each answer was produced by the deterministic query layer and cites the source file. No model has been fine-tuned.

The sample corpus does not include numeric KPI targets. The semantic layer records the formulas and leaves targets empty.

This command is the intended later step. It has not been run here.

```bash
python - << 'PY'
from unsloth import FastLanguageModel
from trl import SFTTrainer
from datasets import load_dataset

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="unsloth/Meta-Llama-3.1-8B-bnb-4bit",
    max_seq_length=2048,
    load_in_4bit=True,
)
model = FastLanguageModel.get_peft_model(
    model, r=16, lora_alpha=16,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
)
trainer = SFTTrainer(
    model=model, tokenizer=tokenizer,
    train_dataset=load_dataset("json", data_files="training/ethikcorp-businessos-instruct.jsonl", split="train"),
    dataset_text_field="messages", max_seq_length=2048,
)
trainer.train()
model.save_pretrained("training/lora-out")
PY
```

An Axolotl config would point `datasets` at the same JSONL, set `base_model: meta-llama/Meta-Llama-3.1-8B`, and use a LoRA adapter. That command has not been run either. The Worker still reports fine-tune as not runnable here.
