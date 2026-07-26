import CircularProgress from '@mui/material/CircularProgress'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Container from '@mui/material/Container'
import Button from '@mui/material/Button'
import { useWizard, WIZARD_STEP_ORDER, WIZARD_STEP_LABELS } from './useWizard'
import { DetailsStep } from './steps/DetailsStep/DetailsStep'
import { ValidateStep } from './steps/ValidateStep/ValidateStep'
import { ReviewStep } from './steps/ReviewStep/ReviewStep'
import { LiveScreen } from './LiveScreen/LiveScreen'

export const Wizard = () => {
  const { isLoading, isLive, currentStep, activeStepIndex, goNext, goHome } = useWizard()

  return (
    <>
      <Container sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="outlined" onClick={goHome} data-testid="wizard-home-button">
          Go Home
        </Button>
      </Container>

      {isLoading && <CircularProgress data-testid="wizard-loading" />}

      {!isLoading && isLive && <LiveScreen />}

      {!isLoading && !isLive && (
        <>
          <Stepper activeStep={activeStepIndex} sx={{ mb: 3 }} data-testid="wizard-stepper">
            {WIZARD_STEP_ORDER.map((step) => (
              <Step key={step} data-testid={`wizard-step-${step.toLowerCase()}`}>
                <StepLabel>{WIZARD_STEP_LABELS[step]}</StepLabel>
              </Step>
            ))}
          </Stepper>
          <Card data-testid="wizard-card">
            <CardContent>
              {currentStep === 'DETAILS' && <DetailsStep onNext={goNext} />}
              {currentStep === 'VALIDATE' && <ValidateStep onNext={goNext} />}
              {currentStep === 'REVIEW' && <ReviewStep />}
            </CardContent>
          </Card>
        </>
      )}
    </>
  )
}
